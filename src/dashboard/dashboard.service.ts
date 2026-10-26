import { Injectable } from '@nestjs/common';
import { PaymentStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { DashboardRange, QueryDashboardDto } from './dto/query-dashboard.dto';

const DASHBOARD_CACHE_TTL = 60;
const TOP_PRODUCT_LIMIT = 5;
const RECENT_ORDER_LIMIT = 5;
const CATEGORY_LIMIT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

type RevenueBucketRow = {
  bucket: string;
  revenue: number;
  orders: number;
};

type TopProductRow = {
  id: string;
  name: string;
  image: string | null;
  sold: number;
  revenue: number;
};

export type RevenuePoint = {
  label: string;
  revenue: number;
  orders: number;
};

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private getCacheKey(range: DashboardRange) {
    return `dashboard:overview:${range}`;
  }

  private startOfUtcDay(date: Date) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private startOfUtcMonth(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  private addUtcDays(date: Date, days: number) {
    return new Date(date.getTime() + days * DAY_MS);
  }

  private addUtcMonths(date: Date, months: number) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
    );
  }

  private toDateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private toMonthKey(date: Date) {
    return date.toISOString().slice(0, 7);
  }

  private getRangeBounds(range: DashboardRange, now: Date) {
    if (range === DashboardRange.WEEK) {
      const currentStart = this.addUtcDays(this.startOfUtcDay(now), -6);
      return {
        currentStart,
        previousStart: this.addUtcDays(currentStart, -7),
      };
    }

    if (range === DashboardRange.MONTH) {
      const currentStart = this.addUtcDays(this.startOfUtcDay(now), -27);
      return {
        currentStart,
        previousStart: this.addUtcDays(currentStart, -28),
      };
    }

    const currentStart = this.addUtcMonths(this.startOfUtcMonth(now), -11);
    return {
      currentStart,
      previousStart: this.addUtcMonths(currentStart, -12),
    };
  }

  private calculateChangePercent(current: number, previous: number) {
    if (previous === 0) {
      return current === 0 ? 0 : null;
    }

    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private async getRevenueSeries(
    range: DashboardRange,
    currentStart: Date,
    now: Date,
  ): Promise<RevenuePoint[]> {
    if (range === DashboardRange.WEEK) {
      const rows = await this.prisma.$queryRaw<RevenueBucketRow[]>`
        SELECT
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS bucket,
          COALESCE(
            SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END),
            0
          )::float AS revenue,
          COUNT(*)::int AS orders
        FROM orders
        WHERE created_at >= ${currentStart} AND created_at <= ${now}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;

      const byBucket = new Map(rows.map((row) => [row.bucket, row]));

      return Array.from({ length: 7 }, (_, index) => {
        const date = this.addUtcDays(currentStart, index);
        const row = byBucket.get(this.toDateKey(date));

        return {
          label: date.toLocaleDateString('en-US', {
            weekday: 'short',
            timeZone: 'UTC',
          }),
          revenue: Number(row?.revenue ?? 0),
          orders: Number(row?.orders ?? 0),
        };
      });
    }

    if (range === DashboardRange.MONTH) {
      const rows = await this.prisma.$queryRaw<RevenueBucketRow[]>`
        SELECT
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS bucket,
          COALESCE(
            SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END),
            0
          )::float AS revenue,
          COUNT(*)::int AS orders
        FROM orders
        WHERE created_at >= ${currentStart} AND created_at <= ${now}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;

      const dailyByBucket = new Map(rows.map((row) => [row.bucket, row]));

      return Array.from({ length: 4 }, (_, weekIndex) => {
        let revenue = 0;
        let orders = 0;

        for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
          const date = this.addUtcDays(currentStart, weekIndex * 7 + dayIndex);
          const row = dailyByBucket.get(this.toDateKey(date));
          revenue += Number(row?.revenue ?? 0);
          orders += Number(row?.orders ?? 0);
        }

        return {
          label: `Week ${weekIndex + 1}`,
          revenue,
          orders,
        };
      });
    }

    const rows = await this.prisma.$queryRaw<RevenueBucketRow[]>`
      SELECT
        to_char(date_trunc('month', created_at), 'YYYY-MM') AS bucket,
        COALESCE(
          SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END),
          0
        )::float AS revenue,
        COUNT(*)::int AS orders
      FROM orders
      WHERE created_at >= ${currentStart} AND created_at <= ${now}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    const byBucket = new Map(rows.map((row) => [row.bucket, row]));

    return Array.from({ length: 12 }, (_, index) => {
      const date = this.addUtcMonths(currentStart, index);
      const row = byBucket.get(this.toMonthKey(date));

      return {
        label: date.toLocaleDateString('en-US', {
          month: 'short',
          timeZone: 'UTC',
        }),
        revenue: Number(row?.revenue ?? 0),
        orders: Number(row?.orders ?? 0),
      };
    });
  }

  async getOverview(query: QueryDashboardDto) {
    const range = query.range ?? DashboardRange.WEEK;
    const cacheKey = this.getCacheKey(range);
    const cached = await this.redisService.get<unknown>(cacheKey);

    if (cached) {
      return {
        message: 'Dashboard overview fetched successfully',
        data: cached,
      };
    }

    const now = new Date();
    const { currentStart, previousStart } = this.getRangeBounds(range, now);
    const thisMonthStart = this.startOfUtcMonth(now);
    const lastMonthStart = this.addUtcMonths(thisMonthStart, -1);

    const [
      totalProducts,
      activeProducts,
      totalCategories,
      activeCategories,
      totalBrands,
      activeBrands,
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      totalCustomers,
      newCustomersThisMonth,
      newCustomersLastMonth,
      revenueData,
      revenueSeries,
      previousOrders,
      previousRevenueData,
      categories,
      topProducts,
      recentOrders,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.category.count(),
      this.prisma.category.count({ where: { isActive: true } }),
      this.prisma.brand.count(),
      this.prisma.brand.count({ where: { isActive: true } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({ where: { status: 'PROCESSING' } }),
      this.prisma.order.count({ where: { status: 'SHIPPED' } }),
      this.prisma.user.count({ where: { role: Role.USER } }),
      this.prisma.user.count({
        where: {
          role: Role.USER,
          createdAt: { gte: thisMonthStart },
        },
      }),
      this.prisma.user.count({
        where: {
          role: Role.USER,
          createdAt: { gte: lastMonthStart, lt: thisMonthStart },
        },
      }),
      this.prisma.order.aggregate({
        where: { paymentStatus: PaymentStatus.PAID },
        _sum: { totalAmount: true },
      }),
      this.getRevenueSeries(range, currentStart, now),
      this.prisma.order.count({
        where: { createdAt: { gte: previousStart, lt: currentStart } },
      }),
      this.prisma.order.aggregate({
        where: {
          paymentStatus: PaymentStatus.PAID,
          createdAt: { gte: previousStart, lt: currentStart },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.category.findMany({
        select: {
          name: true,
          _count: { select: { products: true } },
        },
      }),
      this.prisma.$queryRaw<TopProductRow[]>`
        SELECT
          oi.product_id AS id,
          MAX(oi.product_name) AS name,
          COALESCE(MAX(oi.product_image), MAX(p.images[1])) AS image,
          SUM(oi.quantity)::int AS sold,
          SUM(oi.price * oi.quantity)::float AS revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE o.status NOT IN ('CANCELLED', 'REFUNDED')
        GROUP BY oi.product_id
        ORDER BY sold DESC, revenue DESC
        LIMIT ${TOP_PRODUCT_LIMIT}
      `,
      this.prisma.order.findMany({
        take: RECENT_ORDER_LIMIT,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          shippingAddress: true,
          user: { select: { fullName: true } },
        },
      }),
    ]);

    const currentRevenue = revenueSeries.reduce(
      (sum, point) => sum + point.revenue,
      0,
    );
    const currentOrderCount = revenueSeries.reduce(
      (sum, point) => sum + point.orders,
      0,
    );
    const previousRevenue = previousRevenueData._sum.totalAmount ?? 0;

    const overview = {
      range,
      period: {
        orders: currentOrderCount,
        revenue: currentRevenue,
        previousOrders,
        previousRevenue,
        ordersChangePercent: this.calculateChangePercent(
          currentOrderCount,
          previousOrders,
        ),
        revenueChangePercent: this.calculateChangePercent(
          currentRevenue,
          previousRevenue,
        ),
      },
      summary: {
        totalProducts,
        activeProducts,
        totalCategories,
        activeCategories,
        totalBrands,
        activeBrands,
        totalOrders,
        pendingOrders,
        processingOrders,
        shippedOrders,
        totalCustomers,
        newCustomersThisMonth,
        newCustomersLastMonth,
        collectedRevenue: revenueData._sum.totalAmount ?? 0,
      },
      revenueSeries,
      categoryBreakdown: categories
        .map((category) => ({
          name: category.name,
          products: category._count.products,
        }))
        .filter((category) => category.products > 0)
        .sort((a, b) => b.products - a.products)
        .slice(0, CATEGORY_LIMIT),
      topProducts: topProducts.map((product) => ({
        id: product.id,
        name: product.name,
        image: product.image ?? null,
        sold: Number(product.sold),
        revenue: Number(product.revenue),
      })),
      recentOrders: recentOrders.map((order) => {
        const shippingAddress = order.shippingAddress as {
          fullName?: string;
        } | null;

        return {
          id: order.id,
          customer:
            order.user?.fullName ?? shippingAddress?.fullName ?? 'Guest',
          amount: order.totalAmount,
          status: order.status,
          createdAt: order.createdAt,
        };
      }),
    };

    await this.redisService.set(cacheKey, overview, DASHBOARD_CACHE_TTL);

    return {
      message: 'Dashboard overview fetched successfully',
      data: overview,
    };
  }
}
