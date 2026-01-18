import { IsNotEmpty, IsString, IsUUID, IsIn } from 'class-validator';

export class ValidateCouponDto {
    @IsNotEmpty()
    @IsString()
    couponCode: string;

    @IsNotEmpty()
    @IsUUID()
    planId: string;

    @IsNotEmpty()
    @IsIn(['monthly', 'yearly'])
    duration: 'monthly' | 'yearly';
}
