import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min, Max, IsArray } from "class-validator";

function toStringArray({value}:{value:unknown}){
    if(value===undefined || value===null || value==="") return undefined;
    if (Array.isArray(value)) return value.map(String);
    return String(value).split(",").map((v)=>v.trim()).filter(Boolean);
}

export class QueryProductDto{
    @IsOptional()
    @IsString()
    search?:string;

    @IsOptional()
    @Transform(toStringArray)
    @IsArray()
    @IsString({each:true})
    categoryId?:string[];
    
    @IsOptional()
    @Transform(toStringArray)
    @IsArray()
    @IsString({each:true})
    categorySlug?:string[];

    @IsOptional()
    @Transform(toStringArray)
    @IsArray()
    @IsString({each:true})
    brandId?:string[];

    @IsOptional()
    @Transform(toStringArray)
    @IsArray()
    @IsString({each:true})
    brandSlug?:string[];

    @IsOptional()
    @Transform(({value})=>parseFloat(value))
    @IsNumber()
    minPrice?:number;

    @IsOptional()
    @Transform(({value})=>parseFloat(value))
    @IsNumber()
    maxPrice?:number;

    @IsOptional()
    @Transform(({value})=>parseFloat(value))
    @IsNumber()
    @Min(0)
    @Max(5)
    minRating?:number;

    @IsOptional()
    @Transform(({value})=>parseFloat(value))
    @IsNumber()
    @Min(0)
    @Max(5)
    maxRating?:number;

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