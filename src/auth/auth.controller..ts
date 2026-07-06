import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterRequestDto } from './dto/register-request.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/initiate')
  @HttpCode(HttpStatus.OK)
  async initiateReg(@Body() dto: RegisterRequestDto) {
    return this.authService.initiateRegistration(dto);
  }

  @Post('register/verify')
  @HttpCode(HttpStatus.CREATED)
  async verifyAndRegister(@Body() dto: VerifyOtpDto) {
    return this.authService.completeRegistration(dto);
  }
}