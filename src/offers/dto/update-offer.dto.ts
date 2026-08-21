import { OfferType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, MIN } from "class-validator";

export class UpdateOfferDto{

    @IsOptional()
    @IsString()
    title?:string;

    @IsOptional()
    @IsString()
    description?:string;

    @IsOptional()
    bannerImage?:File;

    @IsOptional()
    @IsEnum(OfferType)
    offerType?:OfferType;

    @IsOptional()
    @Transform(({value})=>parseFloat(value))
    @IsNumber()
    @Min(0)
    offerValue?:number;

    @IsOptional()
    @IsDateString()
    startDate?:string;

    @IsOptional()
    @IsDateString()
    endDate?:string;

    @IsOptional()
    @Transform(({value})=>{
        if(value===true || value==="true") return true;
        if(value===false || value==="false") return false;
        return value;
    })
    @IsBoolean()
    isActive?:boolean;

    @IsOptional()
    @Transform(({value})=>(typeof value==="string"?JSON.parse(value):value))
    @IsArray()
    @IsString({each:true})
    productIds?:string[];

    @IsOptional()
    @Transform(({value})=>(typeof value==="string"?JSON.parse(value):value))
    @IsArray()
    @IsString({each:true})
    brandIds?:string[];


    @IsOptional()
    @Transform(({value})=>(typeof value==="string"?JSON.parse(value):value))
    @IsArray()
    @IsString({each:true})
    categoryIds?:string[];
}