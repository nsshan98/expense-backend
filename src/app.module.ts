import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PlansModule } from './modules/plans/plans.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { FeatureAccessModule } from './modules/feature_access/feature_access.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { PredictionsModule } from './modules/predictions/predictions.module';
import { BillingLocalModule } from './modules/billing_local/billing_local.module';
import { MergeModule } from './modules/merge/merge.module';
import { InsightsModule } from './modules/insights/insights.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PredictionJob } from './jobs/prediction.job';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
    }),
    ScheduleModule.forRoot(),
    DbModule,
    AuthModule,
    UsersModule,
    PlansModule,
    CategoriesModule,
    TransactionsModule,
    FeatureAccessModule,
    BudgetsModule,
    PredictionsModule,
    BillingLocalModule,
    MergeModule,
    InsightsModule,
    AnalyticsModule,
    CommonModule,
  ],
  controllers: [AppController],
  providers: [AppService, PredictionJob],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
