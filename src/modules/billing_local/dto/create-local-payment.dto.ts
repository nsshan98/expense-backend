import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateLocalPaymentDto {
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsNotEmpty()
  @IsNumber()
  planId: number;

  @IsNotEmpty()
  @IsString()
  amount: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
