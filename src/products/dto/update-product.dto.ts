import { Transform } from "class-transformer";
import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString, Min } from "class-validator";

export class UpdateProductDto{
    @IsOptional()
    @IsString()
    name?:string;

    @IsOptional()
    @IsString()
    description?:string;

    @IsOptional()
    @Transform(({value})=>parseFloat(value))
    @IsNumber()
    @Min(0)
    price?:number;

    @IsOptional()
    @Transform(({value})=>parseFloat(value))
    @IsNumber()
    @Min(0)
    salePrice?:number;

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
    trustBadges?:string[];

    @IsOptional()
    @Transform(({value})=>typeof value==="string"?JSON.parse(value):value)
    @IsArray()
    @IsString({each:true})
    features?:string[];

    @IsOptional()
    @Transform(({value})=>typeof value==="string"? JSON.parse(value):value)
    @IsObject()
    specifications?:Record<string,string>[];

    @IsOptional()
    @Transform(({value})=>parseInt(value))
    @IsNumber()
    @Min(0)
    stock?:number;

    @IsOptional()
    @IsString()
    categoryId?:string;

    @IsOptional()
    @IsString()
    brandId?:string;
}