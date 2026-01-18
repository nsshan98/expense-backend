import { IsEnum, IsOptional } from 'class-validator';

export class GetInvoiceDto {
    @IsOptional()
    @IsEnum(['attachment', 'inline'])
    disposition?: 'attachment' | 'inline' = 'attachment';
}
