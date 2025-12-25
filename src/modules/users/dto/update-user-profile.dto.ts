import { OmitType, PartialType } from '@nestjs/mapped-types';
import { RegisterDto } from '../../auth/dto/register.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserProfileDto extends PartialType(
    OmitType(RegisterDto, ['password'] as const),
) {
    @IsOptional()
    @IsString()
    geminiApiKey?: string;
}
