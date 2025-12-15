import { IsJSON, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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
    features: Record<string, any>;
}
