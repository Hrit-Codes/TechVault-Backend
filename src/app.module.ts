import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { MailerModule } from './mailer/mailer.module';
import { OtpModule } from './otp/otp.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { CommonModule } from './common/common.module';
import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { ProductsModule } from './products/products.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { OffersModule } from './offers/offers.module';
import { CompanyInfoModule } from './company-info/company-info.module';
import { HeroSectionsModule } from './hero-sections/hero-sections.module';
import { PromotionalBannersModule } from './promotional-banners/promotional-banners.module';
import { AboutUsModule } from './about-us/about-us.module';
import { CartModule } from './cart/cart.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { CampaignModule } from './campaign/campaign.module';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal:true}),
    PrismaModule,
    MailerModule,
    OtpModule,
    UsersModule,
    AuthModule,
    RedisModule,
    CommonModule,
    CloudinaryModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    ReviewsModule,
    WishlistModule,
    OffersModule,
    CompanyInfoModule,
    HeroSectionsModule,
    PromotionalBannersModule,
    AboutUsModule,
    CartModule,
    NewsletterModule,
    CampaignModule,
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection:{
        host:process.env.REDIS_HOST || "127.0.0.1",
        port:Number(process.env.REDIS_PORT) || 6379
      }
    }),
    OrdersModule,
    PaymentsModule,
    DashboardModule
  ],
  controllers: [],
})
export class AppModule {}
