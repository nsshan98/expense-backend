import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreatePlanDto, PlanFeaturesDto } from './create-plan.dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePlanFeaturesDto extends PartialType(PlanFeaturesDto) { }

export class UpdatePlanDto extends PartialType(OmitType(CreatePlanDto, ['features'] as const)) {
    @IsOptional()
    @ValidateNested()
    @Type(() => UpdatePlanFeaturesDto)
    features?: UpdatePlanFeaturesDto;
}
