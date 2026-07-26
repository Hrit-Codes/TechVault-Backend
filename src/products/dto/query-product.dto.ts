import { Transform } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class QueryProductDto{
    @IsOptional()
    @IsString()
    search?:string;

    @IsOptional()
    @IsString()
    categoryId?:string;

    @IsOptional()
    @IsString()
    categorySlug?:string;

    @IsOptional()
    @IsString()
    brandId?:string;

    @IsOptional()
    @IsString()
    brandSlug?:string;

    @IsOptional()
    @Transform(({value})=>parseFloat(value))
    @IsNumber()
    minPrice?:number;

    @IsOptional()
    @Transform(({value})=>parseFloat(value))
    @IsNumber()
    maxPrice?:number;

    @IsOptional()
    @Transform(({value})=>value==="true"||value===true)
    @IsBoolean()
    isNew?:boolean;

    @IsOptional()
    @Transform(({value})=>value==="true"||value===true)
    @IsBoolean()
    onSale?:boolean;

    @IsOptional()
    @IsString()
    sortBy?:"price_asc"|"price_desc"|"newest"|"rating";

    @IsOptional()
    @Transform(({value})=>parseInt(value))
    @IsNumber()
    @Min(1)
    page?:number=1;

    @IsOptional()
    @Transform(({value})=>parseInt(value))
    @IsNumber()
    @Min(1)
    limit?:number=12;

}