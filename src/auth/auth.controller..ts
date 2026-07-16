import { Body, Controller, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express'; 
import { AuthService } from './auth.service';
import { RegisterRequestDto } from './dto/register-request.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000,
        });

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    } 

    private clearTokenCookies(res: Response) {
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
    }

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
    async login(
        @Body() dto: LoginRequestDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.loginUser(dto);
        this.setTokenCookies(res, result.accessToken, result.refreshToken);

        const { accessToken, refreshToken, ...safeResult } = result;
        return safeResult;
    }

    @Post('refresh')
    @UseGuards(JwtGuard)
    @HttpCode(HttpStatus.OK)
    async refresh(
        @GetUser() user: any,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.refreshTokens(
            user.id,
            (res.req as any).cookies['refresh_token'],
        );
        this.setTokenCookies(res, result.accessToken, result.refreshToken);
        return { message: 'Tokens refreshed successfully' };
    }

    @Post('logout')
    @UseGuards(JwtGuard)
    @HttpCode(HttpStatus.OK)
    async logout(
        @GetUser() user: any,
        @Res({ passthrough: true }) res: Response,
    ) {
        await this.authService.logout(user.id);
        this.clearTokenCookies(res);
        return { message: 'Logged out successfully' };
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto);
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }
}