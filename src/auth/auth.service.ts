import { ConflictException, BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { OtpService } from '../otp/otp.service';
import { RegisterRequestDto } from './dto/register-request.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  private generateAccessToken(payload:{sub:string, email:string, role:string}):string{
    return this.jwtService.sign(payload,{
      secret:this.configService.get<string>("JWT_ACCESS_SECRET"),
      expiresIn:this.configService.get<string>("JWT_ACCESS_EXPIRY")
    } as any)
  }

  private generateRefreshToken(payload:{sub:string}):string{
    return this.jwtService.sign(payload,{
      secret:this.configService.get<string>("JWT_REFRESH_SECRET"),
      expiresIn:this.configService.get<string>("JWT_REFRESH_EXPIRY")
    } as any)
  }

  private async generateTokens(userId:string, email:string, role:string){
    const accessToken = this.generateAccessToken({sub:userId, email, role});
    const refreshToken= this.generateRefreshToken({sub:userId})

    await this.usersService.saveRefreshToken(userId,refreshToken);
    return {accessToken, refreshToken}
  }

  async initiateRegistration(dto: RegisterRequestDto) {
    const existingUser = await this.usersService.findByEmailOrPhone(dto.email, dto.phoneNumber);
    if (existingUser) {
      throw new ConflictException('Email or Phone number is already registered.');
    }

    // Generate and send OTP email via MailerService
    await this.otpService.sendOtpEmail(dto.email, dto.fullName);
    return { message: 'Verification OTP sent to your email.' };
  }

  async completeRegistration(dto: VerifyOtpDto) {
    // Re-verify user didn't register between steps
    const existingUser = await this.usersService.findByEmailOrPhone(dto.email, dto.phoneNumber);
    if (existingUser) {
      throw new ConflictException('Account already registered.');
    }

    // Verify OTP from Redis cache state
    const isValidOtp = await this.otpService.verifyOtp(dto.email, dto.otp);
    if (!isValidOtp) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    // Persist into database via Prisma
    const newUser = await this.usersService.createUser(dto);
    return {
      message: 'Account created successfully.',
      user: newUser,
    };
  }

  async loginUser(dto:LoginRequestDto){
    const user= await this.usersService.verifyPassword(dto.email, dto.password)

    if(!user.isVerified){
      throw new UnauthorizedException("Please verify your email before logging in");
    }

    const tokens= await this.generateTokens(user.id, user.email, user.role);

    await this.usersService.updateLastLogin(user.id);

    return {
      message:"Login successful",
      user:{
        id:user.id,
        fullName:user.fullName,
        email:user.email,
        role:user.role,
      },
      ...tokens
    }
  }

  async refreshTokens(userId:string, refreshToken:string){
    const user=await this.usersService.verifyRefreshToken(userId, refreshToken);
    const tokens= await this.generateTokens(user.id, user.email, user.role);

    return {
      message:"Token refreshed successfully",
      ...tokens
    }
  }

  async logout(userId:string){
    await this.usersService.clearRefreshToken(userId);
    return { message:"Logged out successfully" };
  }
}