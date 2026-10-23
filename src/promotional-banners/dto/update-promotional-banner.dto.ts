import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdatePromotionalBannerDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  linkUrl?: string | null;

  @IsOptional()
  @Transform(({ value }: TransformFnParams) => {
    const raw = value as unknown;
    if (raw === 'true' || raw === true) return true;
    if (raw === 'false' || raw === false) return false;
    return raw;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }: TransformFnParams) => parseInt(String(value)))
  @IsNumber()
  @Min(0)
  order?: number;
}
