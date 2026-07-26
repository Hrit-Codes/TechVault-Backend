import { Transform } from "class-transformer";
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min } from "class-validator";

export class CreateProductDto{
    @IsNotEmpty()
    @IsString()
    name!:string;

    @IsNotEmpty()
    @IsString()
    description!:string;

    @IsNotEmpty()
    @Transform(({value})=>parseFloat(value))
    @IsNumber()
    @Min(0)
    price!:number;

    @IsOptional()
    @Transform(({value})=>parseFloat(value))
    @IsNumber()
    @Min(0)
    salePrice!:number;

    @IsOptional()
    @Transform(({value})=>value==="true"||value===true)
    @IsBoolean()
    onSale?:boolean;

    @IsOptional()
    @IsString()
    badge?:string;

    @IsOptional()
    @Transform(({value})=>value==="true"||value===true)
    @IsBoolean()
    isNew?:boolean;

    @IsOptional()
    @Transform(({value})=>value==="true"||value===true)
    @IsBoolean()
    isActive?:boolean;

    @IsOptional()
    @Transform(({value})=>value==="true"||value===true)
    @IsBoolean()
    freeShipping?:boolean;

    @IsOptional()
    @Transform(({value})=>typeof value==="string"?JSON.parse(value):value)
    @IsArray()
    @IsString({each:true})
    trustBadges?:string[]

    @IsOptional()
    @Transform(({value})=>typeof value==="string"?JSON.parse(value):value)
    @IsArray()
    @IsString({each:true})
    features?:string[]

    @IsOptional()
    @Transform(({value})=>typeof value==="string"?JSON.parse(value):value)
    @IsObject()
    specifications?:Record<string,string>[];

    @IsNotEmpty()
    @Transform(({value})=>parseInt(value))
    @IsNumber()
    @Min(0)
    stock?:number;

    @IsNotEmpty()
    @IsString()
    categoryId!:string;

    @IsNotEmpty()
    @IsString()
    brandId!:string

}