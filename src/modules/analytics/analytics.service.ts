import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { transactions } from '../transactions/entities/transactions.schema';
import { categories } from '../categories/entities/categories.schema';
import { userSettings } from '../users/entities/user_settings.schema';
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

    async getTrendAnalysis(userId: string) {
        // 1. Get User Settings for Weekend Configuration
        const [settings] = await this.drizzleService.db
            .select({ weekendDays: userSettings.weekend_days })
            .from(userSettings)
            .where(eq(userSettings.user_id, userId));

        const weekendDays = settings?.weekendDays as number[];

        if (!weekendDays || !Array.isArray(weekendDays) || weekendDays.length === 0) {
            // Continue without weekend days processing
        }

        const now = new Date();

        // Define Time Ranges
        // A. Calendar Month
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const startOfLastMonth = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1);
        const endOfLastMonth = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0, 23, 59, 59);

        // B. Rolling 30 Days
        const startRollingCurrent = DateUtil.subDays(now, 30);
        const startRollingPrevious = DateUtil.subDays(now, 60);
        // endRollingCurrent is now. endRollingPrevious is startRollingCurrent.

        // C. Seasonality (Last 12 Months)
        const startSeasonality = new Date(now.getFullYear(), now.getMonth() - 11, 1);

        // Fetch Data
        // To optimize, we can fetch all daily data for the max range (Seasonality ~1 year) and aggregate in memory.
        // Or run specific optimized queries. fetching 1 year of daily sums is ~365 rows. Very cheap.
        // Let's fetch daily sums for the last 12 months.

        const dailyData = await this.drizzleService.db
            .select({
                date: sql<string>`DATE(${transactions.date})`,
                amount: sum(transactions.amount).mapWith(Number),
            })
            .from(transactions)
            .leftJoin(categories, eq(transactions.category_id, categories.id))
            .where(
                and(
                    eq(transactions.user_id, userId),
                    sql`${transactions.date} >= ${startSeasonality}`,
                    sql`LOWER(${categories.type}) = 'expense'`
                )
            )
            .groupBy(sql`DATE(${transactions.date})`)
            .orderBy(sql`DATE(${transactions.date})`);

        // Process Data

        // Helper to sum range
        const sumRange = (start: Date, end: Date) => {
            let total = 0;
            const s = start.toISOString().split('T')[0];
            const e = end.toISOString().split('T')[0];
            for (const d of dailyData) {
                if (d.date >= s && d.date <= e) total += d.amount;
            }
            return total;
        };

        // 2. MoM Analysis

        // Calendar Month
        const currentMonthTotal = sumRange(startOfCurrentMonth, now);
        const lastMonthTotal = sumRange(startOfLastMonth, endOfLastMonth);
        const calendarChange = lastMonthTotal > 0 ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

        // Rolling 30 Days
        const rollingCurrentTotal = sumRange(startRollingCurrent, now);
        // Previous 30 days ends just before start of current 30 days
        const rollingPreviousTotal = sumRange(startRollingPrevious, new Date(startRollingCurrent.getTime() - 1));
        const rollingChange = rollingPreviousTotal > 0 ? ((rollingCurrentTotal - rollingPreviousTotal) / rollingPreviousTotal) * 100 : 0;

        // 3. Weekday vs Weekend (Analyze last 3 months for relevance)
        let weekendAnalysis: any;

        if (weekendDays && Array.isArray(weekendDays) && weekendDays.length > 0) {
            const startWeekendAnalysis = DateUtil.subDays(now, 90);
            let weekdaySum = 0;
            let weekdayCount = 0;
            let weekendSum = 0;
            let weekendCount = 0;

            for (const d of dailyData) {
                if (d.date >= startWeekendAnalysis.toISOString().split('T')[0]) {
                    const dayOfWeek = new Date(d.date).getDay(); // 0-6
                    if (weekendDays.includes(dayOfWeek)) {
                        weekendSum += d.amount;
                        weekendCount++;
                    } else {
                        weekdaySum += d.amount;
                        weekdayCount++;
                    }
                }
            }

            const weekdayAvg = weekdayCount > 0 ? weekdaySum / weekdayCount : 0;
            const weekendAvg = weekendCount > 0 ? weekendSum / weekendCount : 0;

            weekendAnalysis = {
                weekday_avg: Number(weekdayAvg.toFixed(2)),
                weekend_avg: Number(weekendAvg.toFixed(2)),
                is_weekend_higher: weekendAvg > weekdayAvg,
                formatted_message: weekendAvg > weekdayAvg
                    ? `You spend ${(weekendAvg / (weekdayAvg || 1)).toFixed(1)}x more on weekends.`
                    : `Your weekday spending is higher.`
            };
        } else {
            weekendAnalysis = {
                status: 'missing_configuration',
                message: 'Please set your weekend days to view this analysis.',
                setup_required: ['weekend_days']
            };
        }

        // 4. Seasonality (Group into months)
        const monthlySeasonalityMap = new Map<string, number>();
        for (const d of dailyData) {
            // d.date is YYYY-MM-DD
            const monthKey = d.date.substring(0, 7); // YYYY-MM
            monthlySeasonalityMap.set(monthKey, (monthlySeasonalityMap.get(monthKey) || 0) + d.amount);
        }

        const seasonality = Array.from(monthlySeasonalityMap.entries()).map(([month, amount]) => {
            const [y, m] = month.split('-');
            const dateObj = new Date(Number(y), Number(m) - 1, 1);
            return {
                month: dateObj.toLocaleString('default', { month: 'short' }),
                fullMonth: month,
                amount
            };
        });

        return {
            status: 'success',
            mom_analysis: {
                calendar_month: {
                    current_total: currentMonthTotal,
                    previous_total: lastMonthTotal,
                    percentage_change: Number(calendarChange.toFixed(1)),
                    period_current: `${startOfCurrentMonth.toLocaleDateString()} - ${now.toLocaleDateString()}`,
                    period_previous: `${startOfLastMonth.toLocaleDateString()} - ${endOfLastMonth.toLocaleDateString()}`
                },
                rolling_30_days: {
                    current_total: rollingCurrentTotal,
                    previous_total: rollingPreviousTotal,
                    percentage_change: Number(rollingChange.toFixed(1)),
                    period_current: 'Last 30 Days',
                    period_previous: 'Previous 30 Days'
                }
            },
            weekend_vs_weekday: weekendAnalysis,
            seasonality: seasonality
        };
    }
}
