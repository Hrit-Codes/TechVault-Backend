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
    CompanyInfoModule
  ],
  controllers: [],
})
export class AppModule {}
