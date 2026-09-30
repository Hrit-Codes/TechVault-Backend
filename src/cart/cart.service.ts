import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OffersService } from '../offers/offers.service';
import { resolveBestOfferForProduct } from '../products/utils/product-decorators';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

type ActiveOffers = Awaited<
  ReturnType<OffersService['getActiveOffersForResolution']>
>;

type CartLine = Prisma.CartItemGetPayload<{
  include: {
    product: {
      select: {
        id: true;
        name: true;
        slug: true;
        images: true;
        price: true;
        salePrice: true;
        onSale: true;
        stock: true;
        isActive: true;
        categoryId: true;
        brandId: true;
      };
    };
    variant: {
      select: {
        id: true;
        color: true;
        variant: true;
        priceOverride: true;
        stockOverride: true;
        isActive: true;
      };
    };
  };
}>;

const cartItemInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      images: true,
      price: true,
      salePrice: true,
      onSale: true,
      stock: true,
      isActive: true,
      categoryId: true,
      brandId: true,
    },
  },
  variant: {
    select: {
      id: true,
      color: true,
      variant: true,
      priceOverride: true,
      stockOverride: true,
      isActive: true,
    },
  },
} satisfies Prisma.CartItemInclude;

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offersService: OffersService,
  ) {}

  /**
   * Compute the effective price for a cart line:
   *   1. Variant override if a variant is selected, otherwise the product's base price
   *   2. Apply the best active offer to that specific price
   */
  private priceCartLine(item: CartLine, activeOffers: ActiveOffers) {
    // Step 1: the price before offers — variant override wins over product base
    const preOfferPrice = item.variant?.priceOverride ?? item.product.price;

    // Step 2: resolve the best offer against this specific price
    const resolved = resolveBestOfferForProduct(activeOffers, {
      id: item.product.id,
      brandId: item.product.brandId,
      categoryId: item.product.categoryId,
      price: preOfferPrice,
    });

    const unitPrice = resolved ? resolved.discountedPrice : preOfferPrice;

    return {
      unitPrice,
      originalPrice: preOfferPrice,
      appliedOffer: resolved
        ? { id: resolved.offer.id, title: resolved.offer.title }
        : null,
      onSale: !!resolved,
    };
  }

  private enrichCartItem(item: CartLine, activeOffers: ActiveOffers) {
    const { unitPrice, originalPrice, appliedOffer, onSale } =
      this.priceCartLine(item, activeOffers);

    const availableStock = item.variant
      ? (item.variant.stockOverride ?? 0)
      : item.product.stock;

    return {
      id: item.id,
      quantity: item.quantity,
      createdAt: item.createdAt,
      product: item.product,
      variant: item.variant,
      unitPrice,
      originalPrice,
      appliedOffer,
      onSale,
      lineTotal: Math.round(unitPrice * item.quantity * 100) / 100,
      availableStock,
      isAvailable:
        item.product.isActive &&
        (item.variant ? item.variant.isActive : true) &&
        availableStock > 0,
    };
  }

  async getCart(userId: string) {
    const [items, activeOffers] = await Promise.all([
      this.prisma.cartItem.findMany({
        where: { userId },
        include: cartItemInclude,
        orderBy: { createdAt: 'desc' },
      }),
      this.offersService.getActiveOffersForResolution(),
    ]);

    const enrichedItems = items.map((item) =>
      this.enrichCartItem(item, activeOffers),
    );

    const subtotal = enrichedItems.reduce(
      (sum, item) => sum + item.lineTotal,
      0,
    );
    const totalItems = enrichedItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    return {
      message: 'Cart fetched successfully',
      data: {
        items: enrichedItems,
        subtotal: Math.round(subtotal * 100) / 100,
        totalItems,
      },
    };
  }

  async addToCart(userId: string, dto: AddToCartDto) {
    const quantity = dto.quantity ?? 1;

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }

    let variant = null as {
      id: string;
      productId: string;
      priceOverride: number | null;
      stockOverride: number | null;
      isActive: boolean;
    } | null;

    if (dto.variantId) {
      variant = await this.prisma.productVariant.findUnique({
        where: { id: dto.variantId },
      });
      if (
        !variant ||
        variant.productId !== dto.productId ||
        !variant.isActive
      ) {
        throw new BadRequestException(
          'Selected variant is not valid for this product',
        );
      }
    }

    const availableStock = variant
      ? (variant.stockOverride ?? 0)
      : product.stock;
    if (availableStock < quantity) {
      throw new BadRequestException(`Only ${availableStock} left in stock`);
    }

    // findFirst, not findUnique — findUnique can't match null in a composite key
    const existing = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        productId: dto.productId,
        variantId: dto.variantId ?? null,
      },
    });

    if (existing) {
      const newQuantity = existing.quantity + quantity;
      if (availableStock < newQuantity) {
        throw new BadRequestException(`Only ${availableStock} left in stock`);
      }
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQuantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          userId,
          productId: dto.productId,
          variantId: dto.variantId ?? null,
          quantity,
        },
      });
    }

    return { message: 'Added to cart' };
  }

  async updateCartItem(
    userId: string,
    cartItemId: string,
    dto: UpdateCartItemDto,
  ) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: cartItemInclude,
    });

    if (!cartItem || cartItem.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    const availableStock = cartItem.variant
      ? (cartItem.variant.stockOverride ?? 0)
      : cartItem.product.stock;

    if (dto.quantity > availableStock) {
      throw new BadRequestException(`Only ${availableStock} left in stock`);
    }

    await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: dto.quantity },
      include: cartItemInclude,
    });


    return {
      message: 'Cart item updated',
    };
  }

  async removeCartItem(userId: string, cartItemId: string) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!cartItem || cartItem.userId !== userId) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: cartItemId } });
    return { message: 'Removed from cart' };
  }

  async clearCart(userId: string) {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
    return { message: 'Cart cleared' };
  }
}
