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
    CategoriesModule
  ],
})
export class AppModule {}
