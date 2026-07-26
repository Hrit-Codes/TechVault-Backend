import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateBrandDto{
    @IsOptional()
    @IsString()
    name?:string

    @IsOptional()
    @IsBoolean()
    isActive?:boolean
}