import { OrderStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";

export class QueryOrdersDto{
    @IsOptional()
    @Transform(({value})=>parseInt(value))
    @IsInt()
    @Min(1)
    page?:number=1;

    @IsOptional()
    @Transform(({value})=>parseInt(value))
    @IsInt()
    @Min(1)
    @Max(100)
    limit?:number=10;

    @IsOptional()
    @IsEnum(OrderStatus)
    status?:OrderStatus
}