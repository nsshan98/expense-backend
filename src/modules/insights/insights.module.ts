import { Module } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';
import { BudgetsModule } from '../budgets/budgets.module';
import { PredictionsModule } from '../predictions/predictions.module';
import { FeatureAccessModule } from '../feature_access/feature_access.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [BudgetsModule, PredictionsModule, FeatureAccessModule, TransactionsModule],
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule { }
