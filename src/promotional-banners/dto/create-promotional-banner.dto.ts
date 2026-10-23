import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePromotionalBannerDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;

  @IsOptional()
  @Transform(({ value }: TransformFnParams) => {
    const raw = value as unknown;
    if (raw === 'true' || raw === true) return true;
    if (raw === 'false' || raw === false) return false;
    return raw;
  })
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @Transform(({ value }: TransformFnParams) => parseInt(String(value)))
  @IsNumber()
  @Min(0)
  order?: number;
}
