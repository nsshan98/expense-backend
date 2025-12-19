import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SubmitPaymentDto {
    @IsNotEmpty()
    @IsUUID()
    planId: string;

    @IsNotEmpty()
    @IsString()
    transactionId: string;

    @IsNotEmpty()
    @IsString()
    provider: string;

    @IsOptional()
    @IsString()
    senderNumber?: string;
}
