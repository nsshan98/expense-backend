import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { predictionsCache } from './entities/predictions_cache.schema';
import { transactions } from '../transactions/entities/transactions.schema';
import { categories } from '../categories/entities/categories.schema';
import { eq, and, sql, sum } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';
import { DateUtil } from '../../common/utils/date.util';

@Injectable()
export class PredictionsService {
  private readonly logger = new Logger(PredictionsService.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly configService: ConfigService,
  ) { }

  async findAll(userId: string) {
    return this.drizzleService.db
      .select({
        categoryId: predictionsCache.category_id,
        categoryName: categories.name,
        predictedAmount: predictionsCache.predicted_monthly_spend,
        generatedAt: predictionsCache.prediction_generated_at,
      })
      .from(predictionsCache)
      .leftJoin(categories, eq(predictionsCache.category_id, categories.id))
      .where(eq(predictionsCache.user_id, userId));
  }

  async refreshPredictions(userId: string) {
    this.logger.log(`Refreshing predictions for user ${userId}`);
    await this.generatePredictions(userId);
    return this.findAll(userId);
  }

  async generatePredictions(userId: string) {
    const lookbackDays =
      this.configService.get<number>('PREDICTION_LOOKBACK_DAYS') || 60;
    const startDate = DateUtil.subDays(new Date(), lookbackDays);

    const dailySpend = await this.drizzleService.db
      .select({
        categoryId: transactions.category_id,
        date: sql`DATE(${transactions.date})`.as('txn_date'),
        total: sum(transactions.amount).mapWith(Number),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.user_id, userId),
          sql`${transactions.date} >= ${startDate}`,
        ),
      )
      .groupBy(transactions.category_id, sql`DATE(${transactions.date})`);

    const categoryMap = new Map<string, { date: string; total: number }[]>();
    for (const record of dailySpend) {
      if (!record.categoryId) continue;
      if (!categoryMap.has(record.categoryId)) {
        categoryMap.set(record.categoryId, []);
      }
      // record.date is aliased as txn_date in SQL but Drizzle types it as 'date' property with unknown type if using sql``
      // Actually Drizzle returns the object structure as defined in select().
      // We aliased it as 'txn_date' in SQL, but Drizzle might map it to 'date' key if we used .as('txn_date') on the sql`` but put it in 'date' property key.
      // Wait, select({ date: sql`...`.as('txn_date') }) means the property on the result object is 'date'.
      // The .as('txn_date') is for the SQL query alias.
      // So we should access record.date.
      const dateStr = String(record.date);
      categoryMap
        .get(record.categoryId)!
        .push({ date: dateStr, total: record.total });
    }

    const predictions: any[] = [];
    const daysInMonth = 30;

    for (const [categoryId, records] of categoryMap.entries()) {
      const totalSpent = records.reduce((sum, r) => sum + r.total, 0);
      let projected = (totalSpent / lookbackDays) * daysInMonth;

      predictions.push({
        user_id: userId,
        category_id: categoryId,
        predicted_monthly_spend: Number(projected.toFixed(2)),
        prediction_generated_at: new Date(),
      });
    }

    if (predictions.length > 0) {
      await this.drizzleService.db.transaction(async (tx) => {
        await tx
          .delete(predictionsCache)
          .where(eq(predictionsCache.user_id, userId));
        await tx.insert(predictionsCache).values(predictions);
      });
    }
  }
}
