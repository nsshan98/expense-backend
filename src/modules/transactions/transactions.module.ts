import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { DbModule } from '../../db/db.module';
import { CategoriesModule } from '../categories/categories.module';
import { MergeModule } from '../merge/merge.module';
import { FeatureAccessModule } from '../feature_access/feature_access.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    DbModule,
    CategoriesModule,
    MergeModule,
    FeatureAccessModule,
    AiModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule { }
