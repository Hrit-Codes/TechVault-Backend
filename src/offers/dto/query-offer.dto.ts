import { Transform } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class QueryOfferDto{
    @IsOptional()
    @IsString()
    search?:string

    @IsOptional()
    @Transform(({value})=>{
        if(value==="true"||value===true) return true;
        if(value==="false"||value===false) return false;
        return value
    })
    @IsBoolean()
    isActive?:boolean

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