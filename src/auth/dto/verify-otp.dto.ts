import { IsNotEmpty, IsString, Length } from 'class-validator';
import { RegisterRequestDto } from './register-request.dto';

export class VerifyOtpDto extends RegisterRequestDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp!: string;
}