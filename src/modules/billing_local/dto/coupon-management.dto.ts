import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsArray, IsDateString } from 'class-validator';

export class CreateCouponDto {
    @IsString()
    code: string;

    @IsEnum(['manual', 'paddle'])
    provider: 'manual' | 'paddle';

    @IsEnum(['flat', 'flat_per_seat', 'percentage'])
    discount_type: 'flat' | 'flat_per_seat' | 'percentage';

    @IsNumber()
    discount_amount: number;

    @IsString()
    @IsOptional()
    currency?: string; // Required for flat discounts

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @IsOptional()
    max_uses?: number;

    @IsDateString()
    @IsOptional()
    expires_at?: string;

    @IsBoolean()
    @IsOptional()
    enabled_for_checkout?: boolean;

    @IsBoolean()
    @IsOptional()
    recur?: boolean;

    @IsNumber()
    @IsOptional()
    maximum_recurring_intervals?: number;

    @IsArray()
    @IsOptional()
    restrict_to?: string[]; // Product or price IDs
}

export class UpdateCouponDto {
    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;

    @IsBoolean()
    @IsOptional()
    enabled_for_checkout?: boolean;

    @IsBoolean()
    @IsOptional()
    recur?: boolean;

    @IsNumber()
    @IsOptional()
    maximum_recurring_intervals?: number;


    @IsString()
    @IsOptional()
    currency?: string;

    @IsDateString()
    @IsOptional()
    expires_at?: string;

    @IsNumber()
    @IsOptional()
    discount_amount?: number;

    @IsEnum(['flat', 'flat_per_seat', 'percentage'])
    @IsOptional()
    discount_type?: 'flat' | 'flat_per_seat' | 'percentage';

    @IsNumber()
    @IsOptional()
    max_uses?: number;
}
