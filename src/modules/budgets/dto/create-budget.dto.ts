import { IsNotEmpty, IsNumber, IsString, IsUUID, IsOptional, ValidateIf } from 'class-validator';

export class CreateBudgetDto {
  @ValidateIf(o => !o.categoryName)
  @IsNotEmpty()
  @IsUUID()
  categoryId?: string;

  @ValidateIf(o => !o.categoryId)
  @IsNotEmpty()
  @IsString()
  categoryName?: string;

  @ValidateIf(o => !o.categoryId)
  @IsNotEmpty()
  @IsString()
  categoryType?: string; // 'EXPENSE' | 'INCOME'

  @IsOptional()
  @IsString()
  month?: string; // MM-YYYY

  @IsNotEmpty()
  @IsNumber()
  amount: number;
}
