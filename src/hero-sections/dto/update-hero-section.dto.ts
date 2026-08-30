import { TextAlignment } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class UpdateHeroSectionDto{
    @IsOptional()
    @IsString()
    eyebrow?:string;

    @IsOptional()
    @IsString()
    headingLine1?:string;

    @IsOptional()
    @IsString()
    headingLine2?:string;

    @IsOptional()
    @IsString()
    description?:string;

    @IsOptional()
    @IsString()
    primaryButtonText?:string;

    @IsOptional()
    @IsString()
    primaryButtonLink?:string;

    @IsOptional()
    @IsString()
    secondaryButtonText?:string;

    @IsOptional()
    @IsString()
    secondaryButtonLink?:string;

    @IsOptional()
    @IsUUID()
    linkedOfferId?:string|null;

    @IsOptional()
    @IsEnum(TextAlignment)
    textAlignment?:TextAlignment;

    @IsOptional()
    @IsString()
    overlayColor?:string;

    @IsOptional()
    @Transform(({value})=>parseInt(value))
    @IsNumber()
    @Min(0)
    @Max(100)
    overlayOpacity?:number;

    @IsOptional()
    @Transform(({value})=>{
        if(value==="true"||value===true) return true;
        if(value==="false"||value===false) return false;
        return value;
    })
    @IsBoolean()
    isActive?:boolean=true;

    @IsOptional()
    @Transform(({value})=>parseInt(value))
    @IsNumber()
    order?:number=0;
}