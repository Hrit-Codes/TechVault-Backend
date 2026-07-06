import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegisterRequestDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsEmail({}, { message: 'Invalid email address' })
  email!: string;

  @Matches(/^(\+977[-\s]?)?9[78]\d{8}$/, {
    message: 'Phone number must be a valid Nepali number (e.g. 98XXXXXXXX or 97XXXXXXXX)',
  })
  phoneNumber!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Matches(/(?=.*[A-Z])/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/(?=.*\d)/, {
    message: 'Password must contain at least one number',
  })
  @Matches(/(?=.*[!@#$%^&*(),.?":{}|<>[\]\\/~`_+=;'-])/, {
    message: 'Password must contain at least one special character',
  })
  password!: string;
}