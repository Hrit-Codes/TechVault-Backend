import { Transform, Type } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Min } from "class-validator";

export class CreateCategoryDto{
    @IsNotEmpty()
    @IsString()
    name!:string

    @IsNotEmpty()
    @IsString()
    subtitle!:string

    @IsOptional()
    @Type(()=>Number)
    @IsNumber()
    @Min(1)
    order?:number

    @IsOptional()
    @IsString()
    image?:string;

    @IsOptional()
    @Transform(({value})=>{
        if ( value==="true" || value===true) return true;
        if ( value==="false" || value===false) return false;
    return value;
    })
    @IsBoolean()
    isActive?:boolean
}