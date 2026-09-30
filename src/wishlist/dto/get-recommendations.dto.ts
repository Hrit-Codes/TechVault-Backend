import { IsInt, IsOptional, Min } from "class-validator";

export class GetRecommendationsDto{
    @IsOptional()
    @IsInt()
    @Min(1)
    limit?:number=12
}