import { IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';

export class CreateBudgetDto {
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

  @IsNotEmpty()
  @IsString()
  amount: string;
}
