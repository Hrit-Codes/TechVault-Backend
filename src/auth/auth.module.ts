import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { OtpModule } from '../otp/otp.module';
import { AuthController } from './auth.controller.';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from '../common/guards/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [JwtModule.register({}), UsersModule, OtpModule], 
  controllers: [AuthController],
  providers: [AuthService,JwtStrategy, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}