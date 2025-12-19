import { IsNotEmpty, IsOptional, IsString, IsUUID, IsIn, IsNumber } from 'class-validator';

export class CreateOrderDto {
    @IsNotEmpty()
    @IsUUID()
    planId: string;

    @IsNotEmpty()
    @IsIn(['monthly', 'yearly'])
    duration: 'monthly' | 'yearly';

    @IsNotEmpty()
    @IsString()
    transactionId: string;

    @IsNotEmpty()
    @IsString()
    provider: string;

    @IsOptional()
    @IsString()
    senderNumber?: string;

    @IsOptional()
    @IsString()
    note?: string;
}
