import { IsArray, IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { OfferType } from "@prisma/client";
import { Transform } from "class-transformer";

export class CreateOfferDto{
    @IsNotEmpty()
    @IsString()
    title!:string;

    @IsOptional()
    @IsString()
    description?:string;

    @IsNotEmpty()
    @IsEnum(OfferType)
    offerType!:OfferType;

    @IsNotEmpty()
    @Transform(({value})=>parseFloat(value))
    @IsNumber()
    @Min(0)
    offerValue!:number;

    @IsNotEmpty()
    @IsDateString()
    startDate!:string;

    @IsNotEmpty()
    @IsDateString()
    endDate!:string;

    @IsOptional()
    @Transform(({value})=>{
        if(value==="true"||value===true) return true;
        if(value==="false"|| value===false) return false;
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