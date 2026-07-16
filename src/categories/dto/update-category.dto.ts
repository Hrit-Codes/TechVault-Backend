import { IsBoolean, IsNumber, IsOptional, IsString, Matches, Min } from "class-validator";

export class UpdateCategoryDto{
    @IsOptional()
    @IsString()
    name?:string

    @IsOptional()
    @IsString()
    subtitle?:string

    // @IsOptional()
    // @IsString()
    // @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase letters, numbers and hyphens only' })
    // slug?: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    order?:number

    @IsOptional()
    @IsBoolean()
    isActive?:boolean

}