import { Transform } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class UpsertAboutUsStoryDto{
    @IsOptional()
    @IsString()
    eyebrow?:string;

    @IsNotEmpty()
    @IsString()
    heading!:string;

    @IsNotEmpty()
    @IsString()
    paragraph!:string;

    @IsNotEmpty()
    @IsString()
    tagline!:string;
}

export class CreatePromiseItemDto{
    @IsNotEmpty()
    @IsString()
    title!:string;

    @IsNotEmpty()
    @IsString()
    description!:string;

    @IsOptional()
    @IsString()
    icon!:string;

    @IsOptional()
    @Transform(({value})=>parseInt(value))
    @IsInt()
    @Min(0)
    order!:number
}

export class UpdatePromiseItemDto{
    @IsOptional()
    @IsString()
    title?:string;

    @IsOptional()
    @IsString()
    description?:string;

    @IsOptional()
    @IsString()
    icon?:string;

    @IsOptional()
    @Transform(({value})=>parseInt(value))
    @IsInt()
    @Min(0)
    order?:number
}

export class CreateFaqItemDto{
    @IsNotEmpty()
    @IsString()
    question!:string;

    @IsNotEmpty()
    @IsString()
    answer!:string;

    @IsOptional()
    @Transform(({value})=>parseInt(value))
    @IsInt()
    @Min(0)
    order?:number;
}

export class UpdateFaqItemDto{
    @IsOptional()
    @IsString()
    question?:string;

    @IsOptional()
    @IsString()
    answer?:string;

    @IsOptional()
    @Transform(({value})=>parseInt(value))
    @IsInt()
    @Min(0)
    order?:number;
}