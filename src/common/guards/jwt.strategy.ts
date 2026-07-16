import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) {
        super({
            // Extract from cookie first, fall back to Bearer token
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request) => {
                    return request?.cookies?.['access_token'] ?? null;
                },
                ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            secretOrKey: configService.get<string>('JWT_ACCESS_SECRET')!,
            ignoreExpiration: false,
        });
    }

    async validate(payload: { sub: string; email: string; role: string }) {
        const user = await this.usersService.findById(payload.sub);

        if (!user) throw new UnauthorizedException('User not found');
        if (!user.isActive) throw new UnauthorizedException('Account is deactivated');

        return {
            id: user.id,
            email: user.email,
            role: user.role,
            fullName: user.fullName,
        };
    }
}