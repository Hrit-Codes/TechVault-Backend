import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateBrandDto{
    @IsNotEmpty()
    @IsString()
    name!:string;

    @IsOptional()
    @IsBoolean()
    isActive?:boolean
}