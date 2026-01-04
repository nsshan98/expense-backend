import { Type } from 'class-transformer';
import { ValidateNested, IsArray, IsString, IsNotEmpty, IsNumber, Matches } from 'class-validator';

export class CreateIncomeDto {
    @IsString()
    @IsNotEmpty()
    source: string;

    @IsNumber()
    amount: number;
}

export class AddIncomeDto {
    @IsString()
    @Matches(/^\d{2}-\d{4}$/, { message: 'Month must be in MM-YYYY format' })
    month: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateIncomeDto)
    incomes: CreateIncomeDto[];
}
