import { ConflictException, BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { OtpService } from '../otp/otp.service';
import { RegisterRequestDto } from './dto/register-request.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
  ) {}

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

}