import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class UpdateCartItemDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity!: number;
}
