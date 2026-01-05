import { IsNumber, IsOptional } from 'class-validator';

export class UpdateSavingsGoalDto {
    @IsOptional()
    @IsNumber()
    amount?: number;
}
