import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { OffersService } from '../offers/offers.service';
import { resolveBestOfferForProduct } from '../products/utils/product-decorators';
import { MailerService } from '../mailer/mailer.service';
import { ConfigService } from '@nestjs/config';
import { orderShippedTemplate } from '../template/orderShippedTemplate';
import { RedisService } from '../redis/redis.service';

const ORDERS_STATS_CACHE_KEY="orders:stats";
const ORDERS_STATS_TTL=60;

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    private static readonly STATUS_RANK: Record<OrderStatus, number> = {
        [OrderStatus.PENDING]: 0,
        [OrderStatus.PROCESSING]: 1,
        [OrderStatus.SHIPPED]: 2,
        [OrderStatus.DELIVERED]: 3,
        [OrderStatus.CANCELLED]: Number.MAX_SAFE_INTEGER,
        [OrderStatus.REFUNDED]: Number.MAX_SAFE_INTEGER,
    };

    constructor(
        private readonly prisma: PrismaService,
        private readonly offersService: OffersService,
        private readonly mailerService: MailerService,
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
    ) {}

    /**
     * Order items snapshot productImage at creation time. Orders created before
     * that column existed have NULL — backfill from the product's current first
     * image at read time so the API always returns an image when one exists.
     */
    private async attachProductImages(
        items: { productId: string; productImage: string | null }[],
    ) {
        const missing = items.filter((item) => !item.productImage);
        if (missing.length === 0) return;

        const productIds = [...new Set(missing.map((item) => item.productId))];
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, images: true },
        });
        const imageById = new Map(
            products.map((product) => [product.id, product.images?.[0] ?? null]),
        );

        for (const item of missing) {
            item.productImage = imageById.get(item.productId) ?? null;
        }
    }

    async createOrder(userId: string, dto: CreateOrderDto) {
        const [cartItems, activeOffers] = await Promise.all([
            this.prisma.cartItem.findMany({
                where: { userId },
                include: { product: { include: { variants: true } } },
            }),
            this.offersService.getActiveOffersForResolution(),
        ]);

        if (cartItems.length === 0) {
            throw new BadRequestException('Cart is empty');
        }

        let totalAmount = 0;
        const orderItemsData = cartItems.map((cartItem) => {
            const product = cartItem.product;
            if (!product.isActive) {
                throw new NotFoundException(`Product not found: ${product.id}`);
            }

            const variant = cartItem.variantId
                ? (product.variants.find((v) => v.id === cartItem.variantId) ?? null)
                : null;
            if (cartItem.variantId && (!variant || !variant.isActive)) {
                throw new BadRequestException(
                    `Selected variant is not valid for ${product.name}`,
                );
            }

            // Same stock semantics as the cart: variants track their own stock
            // (null override means none available), base products use product.stock
            const availableStock = variant
                ? (variant.stockOverride ?? 0)
                : product.stock;
            if (availableStock < cartItem.quantity) {
                throw new BadRequestException(`Not enough stock for ${product.name}`);
            }

            // Same pricing as the cart: variant override, then best active offer
            const preOfferPrice = variant?.priceOverride ?? product.price;
            const resolved = resolveBestOfferForProduct(activeOffers, {
                id: product.id,
                brandId: product.brandId,
                categoryId: product.categoryId,
                price: preOfferPrice,
            });
            const price = resolved ? resolved.discountedPrice : preOfferPrice;
            totalAmount += price * cartItem.quantity;

            return {
                productId: product.id,
                productName: product.name,
                productImage: product.images?.[0] ?? null,
                variantId: variant?.id ?? null,
                variantName: variant
                    ? `${variant.color ?? ''} ${variant.variant ?? ''}`.trim()
                    : null,
                price,
                quantity: cartItem.quantity,
            };
        });

        totalAmount = Math.round(totalAmount * 100) / 100;

        // We use a transaction to ensure stock deduction, order creation and
        // cart clearing are atomic
        const result=await this.prisma.$transaction(async (tx) => {
            // 1. Deduct stock atomically — only if still in stock, preventing overselling
            for (const item of orderItemsData) {
                if (item.variantId) {
                    const { count } = await tx.productVariant.updateMany({
                        where: {
                            id: item.variantId,
                            stockOverride: { gte: item.quantity },
                        },
                        data: { stockOverride: { decrement: item.quantity } },
                    });
                    if (count === 0) {
                        throw new BadRequestException(`Not enough stock for ${item.productName}`);
                    }
                } else {
                    const { count } = await tx.product.updateMany({
                        where: {
                            id: item.productId,
                            stock: { gte: item.quantity },
                        },
                        data: { stock: { decrement: item.quantity } },
                    });
                    if (count === 0) {
                        throw new BadRequestException(`Not enough stock for ${item.productName}`);
                    }
                }
            }

            // 2. Create Order & Payment record
            const order = await tx.order.create({
                data: {
                    userId,
                    totalAmount,
                    paymentMethod: dto.paymentMethod,
                    status: dto.paymentMethod === PaymentMethod.COD ? OrderStatus.PROCESSING : OrderStatus.PENDING,
                    paymentStatus: PaymentStatus.UNPAID,
                    shippingAddress: { ...dto.shippingAddress },
                    items: { create: orderItemsData },
                    payment: {
                        create: { provider: dto.paymentMethod, status: PaymentStatus.UNPAID },
                    },
                },
            });

            // 3. Clear the user's cart now that the order has been placed
            await tx.cartItem.deleteMany({ where: { userId } });

            return { message: 'Order created successfully', data: order };
        });

        await this.redisService.del(ORDERS_STATS_CACHE_KEY);
        return result;
    }

    async refundOrder(orderId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true, payment: true },
        });

        if (!order) throw new NotFoundException('Order not found');
        if (order.status === OrderStatus.REFUNDED || order.status === OrderStatus.CANCELLED) {
            throw new BadRequestException('Order is already refunded or cancelled');
        }

        // Updates the status depending on whether the order is already paid for or not
        // If the order is already paid for, then the order status becomes Refunded otherwise Cancelled
        const isPaid = order.paymentStatus === PaymentStatus.PAID;

        await this.prisma.$transaction(async (tx) => {
            await tx.order.update({
                where: { id: orderId },
                data: {
                    status: isPaid ? OrderStatus.REFUNDED : OrderStatus.CANCELLED,
                    paymentStatus: isPaid ? PaymentStatus.REFUNDED : PaymentStatus.UNPAID,
                },
            });

            if (order.payment) {
                await tx.payment.update({
                    where: { id: order.payment.id },
                    data: { status: isPaid ? PaymentStatus.REFUNDED : PaymentStatus.UNPAID },
                });
            }

            for (const item of order.items) {
                if (item.variantId) {
                    await tx.productVariant.updateMany({
                        where: { id: item.variantId },
                        data: { stockOverride: { increment: item.quantity } },
                    });
                } else {
                    await tx.product.updateMany({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } },
                    });
                }
            }
        });

        await this.redisService.del(ORDERS_STATS_CACHE_KEY);

        return {
            message: 'Order refunded / cancelled and stock restored',
        };
    }

    async getMyOrders(userId: string, query: QueryOrdersDto) {
        const { page = 1, limit = 12, status } = query;
        const skip = (page - 1) * limit;

        const where: any = { userId };
        if (status) where.status = status;

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { items: true },
            }),
            this.prisma.order.count({ where }),
        ]);

        for (const order of orders) {
            await this.attachProductImages(order.items);
        }

        return {
            message: 'Orders fetched successfully',
            data: orders,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
        };
    }

    async getOrderById(orderId: string, userId: string, isAdmin: boolean) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: true,
                payment: true,
                user: {
                    select: {
                        fullName: true,
                        email: true,
                        phoneNumber: true,
                    },
                },
            },
        });

        if (!order) throw new NotFoundException('Order not found');

        // Security: if not admin, ensure they own the order
        if (!isAdmin && order.userId !== userId) {
            throw new NotFoundException('Order not found');
        }

        await this.attachProductImages(order.items);

        return {
            message: 'Order fetched successfully',
            data: order,
        };
    }

    async getAllOrders(query: QueryOrdersDto) {
        const { page = 1, limit = 10, status } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (status) where.status = status;

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { fullName: true, email: true, phoneNumber: true } },
                    items: true,
                },
            }),
            this.prisma.order.count({ where }),
        ]);

        for (const order of orders) {
            await this.attachProductImages(order.items);
        }

        return {
            message: 'All orders fetched successfully',
            data: orders,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
        };
    }

    async updateOrderStatus(orderId: string, newStatus: OrderStatus) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: true,
                user: { select: { email: true } },
            },
        });

        if (!order) throw new NotFoundException('Order not found');

        // Terminal states cannot be updated
        if (
            order.status === OrderStatus.DELIVERED ||
            order.status === OrderStatus.CANCELLED ||
            order.status === OrderStatus.REFUNDED
        ) {
            throw new BadRequestException(`Cannot update a ${order.status} order`);
        }

        // Cancellation / refund must go through the refund endpoint (restores stock)
        if (newStatus === OrderStatus.CANCELLED || newStatus === OrderStatus.REFUNDED) {
            throw new BadRequestException(
                'Use the refund endpoint to cancel or refund an order',
            );
        }

        // Only forward transitions are allowed (PENDING → PROCESSING → SHIPPED → DELIVERED)
        const currentRank = OrdersService.STATUS_RANK[order.status];
        const newRank = OrdersService.STATUS_RANK[newStatus];
        if (newRank <= currentRank) {
            throw new BadRequestException(
                `Cannot move order from ${order.status} to ${newStatus}`,
            );
        }

        // Checks whether the order is COD and the updated status of order is Delivered and unpaid currently
        const markCodPaid =
            newStatus === OrderStatus.DELIVERED &&
            order.paymentMethod === PaymentMethod.COD &&
            order.paymentStatus === PaymentStatus.UNPAID;

        const [updatedOrder] = await this.prisma.$transaction([
            this.prisma.order.update({
                where: { id: orderId },
                data: {
                    status: newStatus,
                    ...(markCodPaid ? { paymentStatus: PaymentStatus.PAID } : {}),
                },
            }),
            ...(markCodPaid
                ? [
                      this.prisma.payment.updateMany({
                          where: { orderId },
                          data: { status: PaymentStatus.PAID },
                      }),
                  ]
                : []),
        ]);

        // Notify the customer once the order is on its way — a SMTP failure
        // must never fail the admin's status update.
        if (newStatus === OrderStatus.SHIPPED && order.user?.email) {
            const shopUrl = (this.configService.get<string>('FRONTEND_URL') ?? '').replace(/\/$/, '');
            try {
                await this.mailerService.getTransporter().sendMail({
                    from: `"TechVault" <${this.configService.get('MAIL_USER')}>`,
                    to: order.user.email,
                    subject: `Your TechVault order #${order.id.slice(0, 8).toUpperCase()} has shipped`,
                    html: orderShippedTemplate(
                        {
                            id: order.id,
                            totalAmount: order.totalAmount,
                            paymentMethod: order.paymentMethod,
                            shippingAddress: order.shippingAddress as {
                                fullName: string;
                                street: string;
                                city: string;
                                phoneNumber: string;
                            },
                            items: order.items.map((item) => ({
                                productName: item.productName,
                                variantName: item.variantName,
                                price: item.price,
                                quantity: item.quantity,
                            })),
                        },
                        shopUrl,
                    ),
                });
            } catch (error) {
                this.logger.error(
                    `Failed to send shipped email for order ${order.id}`,
                    error instanceof Error ? error.message : String(error),
                );
            }
        }

        await this.redisService.del(ORDERS_STATS_CACHE_KEY);
        return { message: 'Order status updated successfully', data: updatedOrder };
    }

    async deletePendingOrder(orderId:string){
        const order=await this.prisma.order.findUnique({
            where:{id:orderId},
            include:{items:true}
        });

        if(!order) throw new NotFoundException("Order not found");

        if(order.status!==OrderStatus.PENDING){
            throw new BadRequestException("Cannot delete an order that is already being processed or paid");
        }

        await this.prisma.$transaction(async(tx)=>{
            for(const item of order.items){
                if(item.variantId){
                    await tx.productVariant.update({
                        where:{id:item.variantId},
                        data:{stockOverride:{increment:item.quantity}},
                    });
                }else{
                    await tx.product.update({
                        where:{id:item.productId},
                        data:{stock:{increment:item.quantity}}
                    })
                }
            }

            await tx.order.delete({where:{id:orderId}});
        })

        await this.redisService.del(ORDERS_STATS_CACHE_KEY);

        return {
            message:"Order deleted and stock restored"
        }
    }

    async getOrderStats(){
        const cached=await this.redisService.get<any>(ORDERS_STATS_CACHE_KEY);
        if(cached){
            return{
                message:"Order statistics fetched successfully",
                data:cached
            }
        }

        const [totalOrders, pendingOrders, returnsAndVoids, processingOrders, shippedOrders, revenueData]=await Promise.all([
            this.prisma.order.count(),
            this.prisma.order.count({where:{status:OrderStatus.PENDING}}),
            this.prisma.order.count({
                where:{status:{in:[OrderStatus.CANCELLED, OrderStatus.REFUNDED]}}
            }),
            this.prisma.order.count({
                where:{status:OrderStatus.PROCESSING}
            }),
            this.prisma.order.count({
                where:{status:OrderStatus.SHIPPED}
            }),
            this.prisma.order.aggregate({
                where:{paymentStatus:PaymentStatus.PAID},
                _sum:{totalAmount:true}
            })
        ]);

        const stats={
            totalOrders,
            pendingOrders,
            returnsAndVoids,
            processing:processingOrders,
            shipped:shippedOrders,
            collectedRevenue:revenueData._sum.totalAmount??0
        }

        await this.redisService.set(ORDERS_STATS_CACHE_KEY,stats,ORDERS_STATS_TTL);

        return{
            message:"Order statistics fetched successfully",
            data:stats
        }
    }
}