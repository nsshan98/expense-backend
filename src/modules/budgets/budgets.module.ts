import { Module } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { BudgetsController } from './budgets.controller';
import { DbModule } from '../../db/db.module';
import { FeatureAccessModule } from '../feature_access/feature_access.module';

@Module({
  imports: [DbModule, FeatureAccessModule],
  controllers: [BudgetsController],
  providers: [BudgetsService],
  exports: [BudgetsService],
})
export class BudgetsModule { }
