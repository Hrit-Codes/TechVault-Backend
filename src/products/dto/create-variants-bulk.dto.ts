import { Type } from 'class-transformer';
import { IsArray, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateVariantsBulkDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variants?: string[];

  @IsOptional()
  @Type(() => Number)    
  @IsInt()
  @Min(0)
  defaultStock?: number;  
  @IsOptional()
  @IsObject()
  priceMap?: Record<string, number>;

  @IsOptional()
  @IsObject()
  stockMap?: Record<string, number>;
}