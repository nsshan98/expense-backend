import { Module } from '@nestjs/common';
import { PredictionsService } from './predictions.service';
import { PredictionsController } from './predictions.controller';
import { DbModule } from '../../db/db.module';
import { FeatureAccessModule } from '../feature_access/feature_access.module';

@Module({
  imports: [DbModule, FeatureAccessModule],
  controllers: [PredictionsController],
  providers: [PredictionsService],
  exports: [PredictionsService],
})
export class PredictionsModule {}
