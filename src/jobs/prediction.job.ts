import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PredictionsService } from '../modules/predictions/predictions.service';
import { DrizzleService } from '../db/db.service';
import { subscriptions } from '../modules/billing_local/entities/billing.schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class PredictionJob {
  private readonly logger = new Logger(PredictionJob.name);

  constructor(
    private readonly predictionsService: PredictionsService,
    private readonly drizzleService: DrizzleService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('Starting daily prediction generation job...');

    // Get all users with active subscriptions (or all users if free tier also gets predictions, but spec says "premium" feature)
    // Actually, FeatureGuard('predictions') implies only premium users see it.
    // So we only generate for premium users to save resources.

    const activeSubs = await this.drizzleService.db
      .select({ userId: subscriptions.user_id })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));

    for (const sub of activeSubs) {
      try {
        await this.predictionsService.generatePredictions(sub.userId);
      } catch (e) {
        this.logger.error(
          `Failed to generate predictions for user ${sub.userId}`,
          e,
        );
      }
    }

    this.logger.log('Daily prediction generation job completed.');
  }
}
