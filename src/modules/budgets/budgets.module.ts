import { Module } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { BudgetsController } from './budgets.controller';
import { DbModule } from '../../db/db.module';
import { FeatureAccessModule } from '../feature_access/feature_access.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [DbModule, FeatureAccessModule, CategoriesModule],
  controllers: [BudgetsController],
  providers: [BudgetsService],
  exports: [BudgetsService],
})
export class BudgetsModule { }
