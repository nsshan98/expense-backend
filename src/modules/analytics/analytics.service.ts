import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { transactions } from '../transactions/entities/transactions.schema';
import { categories } from '../categories/entities/categories.schema';
import { and, eq, sql, sum, count, desc } from 'drizzle-orm';
import { DateUtil } from '../../common/utils/date.util';

@Injectable()
export class AnalyticsService {
    constructor(private readonly drizzleService: DrizzleService) { }

    async getSpendBreakdown(userId: string, startDate: Date, endDate: Date) {
        // 1. Fetch raw grouped data: Category -> Merchant -> Sum/Count
        const rawData = await this.drizzleService.db
            .select({
                categoryId: categories.id,
                categoryName: categories.name,
                merchantName: sql<string>`MAX(${transactions.name})`, // Pick one display name for the group
                merchantNormalizedName: transactions.normalized_name,
                totalAmount: sum(transactions.amount).mapWith(Number),
                transactionCount: count(transactions.id),
            })
            .from(transactions)
            .leftJoin(categories, eq(transactions.category_id, categories.id))
            .where(
                and(
                    eq(transactions.user_id, userId),
                    sql`${transactions.date} >= ${startDate} AND ${transactions.date} <= ${endDate}`,
                    sql`LOWER(${categories.type}) = 'expense'` // Only expenses
                )
            )
            .groupBy(categories.id, categories.name, transactions.normalized_name)
            .orderBy(categories.name, desc(sum(transactions.amount)));

        // 2. Post-process into a nested structure
        const categoryMap = new Map<string, any>();
        let grandTotal = 0;

        for (const row of rawData) {
            const catKey = row.categoryId || 'uncategorized';
            const catName = row.categoryName || 'Uncategorized';
            const amount = Number(row.totalAmount);

            grandTotal += amount;

            if (!categoryMap.has(catKey)) {
                categoryMap.set(catKey, {
                    id: catKey,
                    name: catName,
                    total: 0,
                    count: 0,
                    merchants: [],
                });
            }

            const category = categoryMap.get(catKey);
            category.total += amount;
            category.count += Number(row.transactionCount);

            // Add merchant details
            category.merchants.push({
                name: row.merchantName || row.merchantNormalizedName || 'Unknown',
                amount: amount,
                count: Number(row.transactionCount),
            });
        }

        // 3. Final formatting: Calculate percentages and sort
        const breakdown = Array.from(categoryMap.values()).map(cat => {
            // Sort merchants by amount
            cat.merchants.sort((a, b) => b.amount - a.amount);

            return {
                ...cat,
                percentage: grandTotal > 0 ? Number(((cat.total / grandTotal) * 100).toFixed(1)) : 0,
                merchants: cat.merchants // Existing list is already sorted
            };
        });

        // Sort categories by total spend
        breakdown.sort((a, b) => b.total - a.total);

        return {
            period: {
                start: DateUtil.formatDate(startDate),
                end: DateUtil.formatDate(endDate)
            },
            total_spend: grandTotal,
            breakdown
        };
    }
}
