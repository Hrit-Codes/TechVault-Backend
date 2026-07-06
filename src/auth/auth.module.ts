import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { OtpModule } from '../otp/otp.module';
import { AuthController } from './auth.controller.';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [UsersModule, OtpModule, JwtModule.register({})], 
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}