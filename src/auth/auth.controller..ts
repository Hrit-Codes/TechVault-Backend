import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterRequestDto } from './dto/register-request.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginRequestDto } from './dto/login-request.dto';

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

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto:LoginRequestDto){
    return this.authService.loginUser(dto)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body:{ userId:string, refreshToken:string}){
    return this.authService.refreshTokens(body.userId, body.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body:{userId:string}){
    return this.authService.logout(body.userId);
  }
}