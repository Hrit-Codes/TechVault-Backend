import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { QuerySubscribersDto } from './dto/query-subscribers.dto';
import { IPagination } from '../types/pagination.types';
import {
  unsubscribeConfirmEmailTemplate,
  welcomeEmailTemplate,
} from '../template/newsletterEmailTemplate';
import { RedisService } from '../redis/redis.service';


@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  // ─── HELPER ────────────────────────────────────────────────
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private getFrontendUrl(): string {
    return (this.configService.get<string>('FRONTEND_URL') ?? '').replace(
      /\/$/,
      '',
    );
  }

  private async sendMail(
    email: string,
    subject: string,
    html: string,
  ): Promise<void> {
    try {
      await this.mailerService.getTransporter().sendMail({
        from: `"TechVault" <${this.configService.get('MAIL_USER')}>`,
        to: email,
        subject,
        html,
      });
    } catch (error) {
      // Never fail the request because of a delivery issue
      this.logger.error(`Failed to send "${subject}" to ${email}`, error);
    }
  }

  // ─── PUBLIC ────────────────────────────────────────────────
  async subscribe(email: string): Promise<{ message: string; data: any }> {
    const normalizedEmail = this.normalizeEmail(email);

    const existing = await this.prisma.subscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException({
          message: 'This email is already subscribed',
          alreadySubscribed: true,
        });
      }

      const resubscribed = await this.prisma.subscriber.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          unsubscribedAt: null,
          subscribedAt: new Date(),
        },
      });

      await this.sendWelcomeEmail(
        resubscribed.email,
        resubscribed.unsubscribeToken,
      );

      return {
        message: 'You have been re-subscribed successfully',
        data: {
          email: resubscribed.email,
          isSubscribed: true,
          subscribedAt: resubscribed.subscribedAt,
        },
      };
    }

    const subscriber = await this.prisma.subscriber.create({
      data: { email: normalizedEmail },
    });

    await this.sendWelcomeEmail(subscriber.email, subscriber.unsubscribeToken);

    return {
      message: 'Subscribed successfully',
      data: {
        email: subscriber.email,
        isSubscribed: true,
        subscribedAt: subscriber.subscribedAt,
      },
    };
  }

  async getSubscriptionStatus(
    email: string,
  ): Promise<{ message: string; data: any }> {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { email: this.normalizeEmail(email) },
      select: {
        email: true,
        isActive: true,
        subscribedAt: true,
        unsubscribedAt: true,
      },
    });

    if (!subscriber) throw new NotFoundException('Email not subscribed yet');

    return {
      message: 'Subscription status fetched successfully',
      data: {
        email: subscriber.email,
        isSubscribed: subscriber.isActive,
        isActive: subscriber.isActive,
        subscribedAt: subscriber.subscribedAt,
        unsubscribedAt: subscriber.unsubscribedAt,
      },
    };
  }

  async unsubscribeByEmail(
    email: string,
  ): Promise<{ message: string; data: any }> {
    const normalizedEmail = this.normalizeEmail(email);

    const subscriber = await this.prisma.subscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (!subscriber) {
      throw new NotFoundException('Email not found in our subscription list');
    }

    if (!subscriber.isActive) {
      return {
        message: 'You are already unsubscribed',
        data: { email: normalizedEmail, isSubscribed: false },
      };
    }

    const unsubscribed = await this.prisma.subscriber.update({
      where: { id: subscriber.id },
      data: { isActive: false, unsubscribedAt: new Date() },
    });

    await this.sendUnsubscribeConfirmation(
      unsubscribed.email,
      unsubscribed.unsubscribeToken,
    );

    return {
      message: 'You have been unsubscribed successfully',
      data: { email: unsubscribed.email, isSubscribed: false },
    };
  }

  async unsubscribeByToken(
    token: string,
  ): Promise<{ message: string; data: any }> {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!subscriber) {
      throw new NotFoundException('Invalid or expired unsubscribe link');
    }

    if (!subscriber.isActive) {
      return {
        message: 'You are already unsubscribed',
        data: { email: subscriber.email, isSubscribed: false },
      };
    }

    const unsubscribed = await this.prisma.subscriber.update({
      where: { id: subscriber.id },
      data: { isActive: false, unsubscribedAt: new Date() },
    });

    await this.sendUnsubscribeConfirmation(
      unsubscribed.email,
      unsubscribed.unsubscribeToken,
    );

    return {
      message: 'You have been unsubscribed successfully',
      data: { email: unsubscribed.email, isSubscribed: false },
    };
  }

  // ─── EMAILS ────────────────────────────────────────────────
  private async sendWelcomeEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.getFrontendUrl();

    await this.sendMail(
      email,
      'You are subscribed to the TechVault newsletter',
      welcomeEmailTemplate(
        email,
        `${frontendUrl}/unsubscribe?token=${token}`,
        frontendUrl,
      ),
    );
  }

  private async sendUnsubscribeConfirmation(
    email: string,
    token: string,
  ): Promise<void> {
    await this.sendMail(
      email,
      'You have been unsubscribed from the TechVault newsletter',
      unsubscribeConfirmEmailTemplate(
        email,
        `${this.getFrontendUrl()}/subscribe?email=${encodeURIComponent(email)}&token=${token}`,
      ),
    );
  }

  // ─── ADMIN ─────────────────────────────────────────────────
  async getAllSubscribers(
    query: QuerySubscribersDto,
  ): Promise<{ message: string; data: any[]; pagination: IPagination }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.email = { contains: query.search, mode: 'insensitive' };
    }

    const [total, subscribers] = await Promise.all([
      this.prisma.subscriber.count({ where }),
      this.prisma.subscriber.findMany({
        where,
        skip,
        take: limit,
        orderBy: { subscribedAt: 'desc' },
        omit: { unsubscribeToken: true },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      message: 'Subscribers fetched successfully',
      data: subscribers,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getSubscribersStats(): Promise<{ message: string; data: any }> {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = thisMonthStart;

    const [
      totalSubscribers,
      activeSubscribers,
      unsubscribed,
      newThisMonth,
      newLastMonth,
    ] = await Promise.all([
      this.prisma.subscriber.count(),
      this.prisma.subscriber.count({ where: { isActive: true } }),
      this.prisma.subscriber.count({ where: { isActive: false } }),
      this.prisma.subscriber.count({
        where: { subscribedAt: { gte: thisMonthStart, lt: thisMonthEnd } },
      }),
      this.prisma.subscriber.count({
        where: { subscribedAt: { gte: lastMonthStart, lt: lastMonthEnd } },
      }),
    ]);

    const growthRate =
      newLastMonth > 0
        ? Number(
            (((newThisMonth - newLastMonth) / newLastMonth) * 100).toFixed(2),
          )
        : 0;

    return {
      message: 'Subscriber statistics fetched successfully',
      data: {
        totalSubscribers,
        activeSubscribers,
        unsubscribed,
        newThisMonth,
        newLastMonth,
        growthRate,
      },
    };
  }
}
