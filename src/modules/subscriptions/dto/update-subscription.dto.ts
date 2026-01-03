import { PartialType } from '@nestjs/mapped-types';
import { CreateSubscriptionDto } from './create-subscription.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSubscriptionDto extends PartialType(CreateSubscriptionDto) {
    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}
