import { IsString, IsNumber, IsOptional, Matches } from 'class-validator';

export class SetSavingsGoalDto {
    @IsString()
    @Matches(/^\d{2}-\d{4}$/, { message: 'Month must be in MM-YYYY format' })
    month: string;

    @IsNumber()
    amount: number;
}
