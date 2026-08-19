import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";

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
    @Transform(({value})=>{
        if(value===true||value==="true") return true;
        if(value===false||value==="false") return false;
        return value;
    })
    @IsBoolean()
    isNew?:boolean;

    @IsOptional()
    @Transform(({value})=>{
        if(value===true||value==="true") return true;
        if(value===false||value==="false") return false;
        return value;
    })
    @IsBoolean()
    isActive?:boolean;

    @IsOptional()
    @IsIn(["low-stock","out-of-stock"])
    stockStatus?:"low-stock"|"out-of-stock";

    @IsOptional()
    @Transform(({value})=>{
        if(value===true||value==="true") return true;
        if(value===false|| value==="false") return false;
    })
    @IsBoolean()
    onSale?:boolean;

    @IsOptional()
    @IsString()
    sortBy?:"price_asc"|"price_desc"|"newest"|"rating_asc"| "rating_desc";

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