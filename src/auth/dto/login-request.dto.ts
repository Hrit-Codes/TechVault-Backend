import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from "class-validator";

export class LoginRequestDto{
    @IsEmail()
    @IsNotEmpty()
    email!:string

    @IsString()
    @IsNotEmpty()
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
    password!:string
}