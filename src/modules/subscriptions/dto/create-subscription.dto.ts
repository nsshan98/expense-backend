import { IsString, IsNumber, IsOptional, IsArray, IsDateString, IsUUID } from 'class-validator';

export class CreateSubscriptionDto {
    @IsString()
    name: string;

    @IsNumber()
    amount: number;

    @IsString()
    @IsOptional()
    currency?: string;

    @IsNumber()
    @IsOptional()
    global_amount?: number;

    @IsString()
    @IsOptional()
    global_currency?: string;

    @IsString()
    billing_cycle: string;

    @IsDateString()
    next_renewal_date: string;

    @IsUUID()
    category_id: string;

    @IsNumber()
    @IsOptional()
    alert_days?: number;

    @IsString()
    @IsOptional()
    description?: string;
}
