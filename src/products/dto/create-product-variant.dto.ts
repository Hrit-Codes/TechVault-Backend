import { Transform } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateProductVariantDto{
    @IsOptional()
    @IsString()
    color?:string;

    @IsOptional()
    @IsString()
    variant?:string;

    @IsOptional()
    @Transform(({value})=>(value===""|| value===null? undefined:parseFloat(value)))
    @IsNumber()
    @Min(0)
    priceOverride?:number;

    @IsOptional()
    @Transform(({value})=>(value===""||value===null?undefined:parseFloat(value)))
    @IsNumber()
    @Min(0)
    stockOverride?:number;

    @IsOptional()
    @Transform(({value})=>{
        if(value==="true"||value===true) return true;
        if(value==="false"||value===false) return false;
        return value;
    })
    @IsBoolean()
    isActive?:boolean;
}