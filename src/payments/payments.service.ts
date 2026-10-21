import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // ─── KHALTI: INITIATE PAYMENT ──────────────────────────────
  async initiateKhalti(orderId: string, userId: string) {
    // 1. Verify order exists and belongs to user
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, userId },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }
    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REFUNDED
    ) {
      throw new BadRequestException(
        `Cannot initiate payment for a ${order.status} order`,
      );
    }
    if (order.paymentMethod !== PaymentMethod.KHALTI) {
      throw new BadRequestException('This order was not placed with Khalti');
    }

    // 2. Prepare Khalti Payload
    const payload = {
      return_url: `${this.configService.get('FRONTEND_URL')}/payment/khalti/callback`,
      website_url: `${this.configService.get('FRONTEND_URL')}`,
      amount: Math.round(order.totalAmount * 100), // Khalti expects Paisa (Rs 10 = 1000)
      purchase_order_id: order.id,
      purchase_order_name: `TechVault Order #${order.id.slice(0, 8)}`,
    };

    try {
      // 3. Call Khalti Initiate API
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${this.configService.get('KHALTI_BASE_URL')}/epayment/initiate/`,
          payload,
          {
            headers: {
              Authorization: `key ${this.configService.get('KHALTI_SECRET_KEY')}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      // 4. Save the pidx to the payment record (upsert in case the row is missing)
      await this.prisma.payment.upsert({
        where: { orderId },
        update: { transactionId: data.pidx, gatewayPayload: data },
        create: {
          orderId,
          provider: PaymentMethod.KHALTI,
          status: PaymentStatus.UNPAID,
          transactionId: data.pidx,
          gatewayPayload: data,
        },
      });

      // 5. Return the payment URL for the frontend to redirect to
      return {
        message: 'Payment initiated successfully',
        data: {
          paymentUrl: data.payment_url,
          pidx: data.pidx,
        },
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Khalti Initiate Error:', error?.response?.data || error.message);
      throw new BadRequestException('Failed to initiate Khalti payment');
    }
  }

  // ─── KHALTI: VERIFY PAYMENT ────────────────────────────────
  async verifyKhalti(pidx: string, userId: string) {
    try {
      // 1. Ask Khalti for the truth (Lookup API)
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${this.configService.get('KHALTI_BASE_URL')}/epayment/lookup/`,
          { pidx },
          {
            headers: {
              Authorization: `key ${this.configService.get('KHALTI_SECRET_KEY')}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      // 2. Ensure Khalti says it's Completed
      if (data.status !== 'Completed') {
        throw new BadRequestException(`Payment is not completed. Status: ${data.status}`);
      }

      // 3. The lookup response must refer to the pidx we asked about
      if (data.pidx && data.pidx !== pidx) {
        throw new BadRequestException('Payment pidx mismatch');
      }

      // 4. Find our payment record
      const payment = await this.prisma.payment.findUnique({
        where: { transactionId: pidx },
        include: { order: true },
      });

      if (!payment || payment.order.userId !== userId) {
        throw new NotFoundException('Payment record not found');
      }

      if (payment.provider !== PaymentMethod.KHALTI) {
        throw new BadRequestException('Payment does not belong to Khalti');
      }

      // 5. The payment must belong to the order Khalti was told about
      if (data.purchase_order_id && data.purchase_order_id !== payment.orderId) {
        throw new BadRequestException('Payment does not match this order');
      }

      // 6. Prevent double-verification
      if (payment.status === PaymentStatus.PAID) {
        return {
          message: 'Payment already verified',
          data: { orderId: payment.orderId },
        };
      }

      // 7. Verify amount (Security check against tampering)
      const expectedAmount = Math.round(payment.order.totalAmount * 100);
      if (data.total_amount !== expectedAmount) {
        throw new BadRequestException('Amount mismatch detected. Potential fraud.');
      }

      // 8. Mark as PAID & move order to PROCESSING
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.PAID, gatewayPayload: data },
        }),
        this.prisma.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.PROCESSING,
          },
        }),
      ]);

      return {
        message: 'Payment verified successfully',
        data: { orderId: payment.orderId },
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Khalti Verify Error:', error?.response?.data || error.message);
      throw new BadRequestException('Payment verification failed');
    }
  }
}
