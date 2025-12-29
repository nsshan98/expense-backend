import { OmitType, PartialType } from '@nestjs/mapped-types';
import { RegisterDto } from '../../auth/dto/register.dto';
import { IsOptional, IsString, IsArray, IsNumber } from 'class-validator';

export class UpdateUserProfileDto extends PartialType(
    OmitType(RegisterDto, ['password'] as const),
) {
    @IsOptional()
    @IsString()
    geminiApiKey?: string;

    @IsOptional()
    @IsArray()
    @IsNumber({}, { each: true })
    weekendDays?: number[];

    @IsOptional()
    @IsString()
    currency?: string;
}
