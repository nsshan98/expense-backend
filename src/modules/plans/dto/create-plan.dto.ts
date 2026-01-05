import { IsBoolean, IsNotEmpty, IsNumber, IsString, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';


export class PlanFeaturesDto {
    @IsNotEmpty()
    @IsNumber()
    max_categories: number;

    @IsNotEmpty()
    @IsNumber()
    max_budgets: number;

    @IsNotEmpty()
    @IsNumber()
    max_transactions: number;

    @IsBoolean()
    @IsNotEmpty()
    can_export_data: boolean;

    @IsBoolean()
    @IsNotEmpty()
    is_premium: boolean;
}

export class CreatePlanDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsNumber()
    price_monthly: number;

    @IsNotEmpty()
    @IsNumber()
    price_yearly: number;

    @IsOptional()
    @IsNotEmpty()
    features: PlanFeaturesDto;

    @IsOptional()
    display_features: Record<string, any>;
}
