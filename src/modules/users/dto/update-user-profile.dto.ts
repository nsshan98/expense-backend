import { OmitType, PartialType } from '@nestjs/mapped-types';
import { RegisterDto } from '../../auth/dto/register.dto';

export class UpdateUserProfileDto extends PartialType(
    OmitType(RegisterDto, ['password'] as const),
) { }
