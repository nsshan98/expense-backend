import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateIncomeDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    source?: string;

    @IsOptional()
    @IsNumber()
    amount?: number;
}
