import { Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class CursorPaginationDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}
