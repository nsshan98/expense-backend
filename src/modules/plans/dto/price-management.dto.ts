import { IsString, IsNumber, IsOptional, IsEnum, IsObject } from 'class-validator';

export class CreatePriceDto {
    @IsString()
    plan_id: string;

    @IsEnum(['manual', 'paddle'])
    provider: 'manual' | 'paddle';

    @IsEnum(['monthly', 'yearly', 'one-time'])
    @IsOptional()
    interval?: 'monthly' | 'yearly' | 'one-time';

    @IsString()
    currency: string;

    @IsNumber()
    @IsOptional()
    amount?: number; // Required for manual, optional for paddle

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    name?: string;

    @IsNumber()
    @IsOptional()
    min_quantity?: number;

    @IsNumber()
    @IsOptional()
    max_quantity?: number;

    @IsOptional()
    unit_price_overrides?: {
        countryCodes: string[];
        unitPrice: {
            amount: string;
            currency_code: string;
        };
    }[];

    @IsObject()
    @IsOptional()
    billing_cycle?: {
        interval: 'day' | 'week' | 'month' | 'year';
        frequency: number;
    };

    @IsObject()
    @IsOptional()
    trial_period?: {
        interval: 'day' | 'week' | 'month' | 'year';
        frequency: number;
    };
}

export class UpdatePriceDto {
    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @IsOptional()
    amount?: number;

    @IsString()
    @IsOptional()
    currency?: string;

    @IsString()
    @IsOptional()
    name?: string;

    @IsNumber()
    @IsOptional()
    min_quantity?: number;

    @IsNumber()
    @IsOptional()
    max_quantity?: number;

    @IsOptional()
    unit_price_overrides?: {
        countryCodes: string[];
        unitPrice: {
            amount: string;
            currency_code: string;
        };
    }[];
}
