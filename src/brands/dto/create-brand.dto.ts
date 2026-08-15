import { Transform } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateBrandDto{
    @IsNotEmpty()
    @IsString()
    name!:string;

    @IsOptional()
    @Transform(({value})=>{
        if ( value==="true" || value===true) return true;
        if ( value==="false" || value===false) return false;
    return value;
    })
    @IsBoolean()
    isActive?:boolean

    @IsOptional()
    @IsString()
    logo?:string;
}