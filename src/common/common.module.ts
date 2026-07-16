import { Global, Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { UsersModule } from "../users/users.module";
import { JwtStrategy } from "./guards/jwt.strategy";
import { JwtGuard } from "./guards/jwt.guard";
import { RolesGuard } from "./guards/roles.guard";

@Global()
@Module({
    imports:[
        PassportModule.register({defaultStrategy:'jwt'}),
        UsersModule,
    ],
    providers:[JwtStrategy, JwtGuard, RolesGuard],
    exports:[PassportModule, JwtStrategy, JwtGuard, RolesGuard]
})

export class CommonModule{}