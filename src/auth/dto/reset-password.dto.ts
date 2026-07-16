import { IsEmail, IsNotEmpty, IsString, Matches, MinLength, minLength } from "class-validator";

export class ResetPasswordDto{
    @IsEmail()
    @IsNotEmpty()
    email!:string;

    @IsString()
    @IsNotEmpty()
    otp!:string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @Matches(/(?=.*[A-Z])/, { message: 'Password must contain at least one uppercase letter' })
    @Matches(/(?=.*\d)/, { message: 'Password must contain at least one number' })
    @Matches(/(?=.*[!@#$%^&*(),.?":{}|<>[\]\\/~`_+=;'-])/, { message: 'Password must contain at least one special character' })
    newPassword!:string;
}