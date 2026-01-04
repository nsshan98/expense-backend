import { IsString, IsNumber, IsNotEmpty, IsArray, ValidateNested, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateBudgetDto } from './create-budget.dto';

class PlanIncomeDto {
    @IsString()
    @IsNotEmpty()
    source: string;

    @IsNumber()
    amount: number;
}

export class CreateMonthlyPlanDto {
    @IsString()
    @Matches(/^\d{2}-\d{4}$/, { message: 'Month must be in MM-YYYY format' })
    month: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PlanIncomeDto)
    incomes: PlanIncomeDto[];

    @IsNumber()
    savings_goal: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateBudgetDto)
    budgets: CreateBudgetDto[];
}
