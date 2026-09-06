import { Transform } from "class-transformer";
import { IsArray, IsNumber, IsObject, IsOptional, IsString } from "class-validator";

export class UpdateCompanyInfoDto{
    @IsOptional()
    @IsString()
    companyName?:string;

    @IsOptional()
    @IsString()
    officeAddress?:string;

    @IsOptional()
    @IsString()
    officeTelephone?:string;

    @IsOptional()
    @Transform(({value})=>(typeof value==="string"?JSON.parse(value):value))
    @IsArray()
    @IsString({each:true})
    emails?:string[]

    @IsOptional()
    @Transform(({value})=>(typeof value==="string"?JSON.parse(value):value))
    @IsArray()
    @IsOptional()
    phones?:string[];

    @IsOptional()
    @IsString()
    description?:string;

    @IsOptional()
    @Transform(({value})=>(typeof value==="string"?JSON.parse(value):value))
    @IsObject()
    socialLinks?:{
        facebook?:string;
        instagram?:string;
        linkedin?:string;
        twitter?:string;
        youtube?:string;
        tiktok?:string;
    }
    
    @IsOptional()
    @Transform(({value})=>parseFloat(value))
    @IsNumber()
    mapLongitude?:number;

    @IsOptional()
    @Transform(({value})=>parseFloat(value))
    @IsNumber()
    mapLatitude?:number;

    @IsOptional()
    @IsString()
    mapEmbedUrl?:string
}