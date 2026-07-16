import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UsersService } from "../../users/users.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private readonly usersService:UsersService
    ){
        const secret= process.env.JWT_ACCESS_SECRET;
        if(!secret){
            throw new Error("JWT_ACCESS_SECRET is not defined in the environment variables");
        }

        super({
            // Extracts JWT from Authorization header
            jwtFromRequest:ExtractJwt.fromAuthHeaderAsBearerToken(),
            //The secret used to verify the token
            secretOrKey:secret,
            // Reject expired tokens
            ignoreExpiration:false,
        })
    }

    // Passport automatically verifies the token and calls this method
    async validate(payload:{sub:string,email:string,role:string}){
        //The payload is the decoded JWT content
        // Now just need to validate the user exists and is active
        const user=await this.usersService.findById(payload.sub);

        if(!user) throw new UnauthorizedException('User not found');

        if(!user.isActive) throw new UnauthorizedException('User account is deactivated');

        // Return the user object to attach to request.user
        return {
            id:user.id,
            email:user.email,
            role:user.role,
            fullName:user.fullName
        };
    }
}