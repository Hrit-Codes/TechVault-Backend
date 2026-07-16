import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Min } from "class-validator";

export class CreateCategoryDto{
    @IsNotEmpty()
    @IsString()
    name!:string

    @IsNotEmpty()
    @IsString()
    subtitle!:string

    @IsOptional()
    @IsNumber()
    @Min(1)
    order?:number

    @IsOptional()
    @IsBoolean()
    isActive?:boolean
}