import { Transform, Type } from "class-transformer";
import { IsNumber, IsOptional, Min } from "class-validator";

export class QueryReviewDto{
    @IsOptional()
    @Type(()=>Number)
    @IsNumber()
    @Min(1)
    page?:number=1;

    @IsOptional()
    @Type(()=>Number)
    @IsNumber()
    @Min(1)
    limit?:number=12;
}