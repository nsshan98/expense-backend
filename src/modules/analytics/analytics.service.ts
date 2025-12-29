import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { transactions } from '../transactions/entities/transactions.schema';
import { categories } from '../categories/entities/categories.schema';
import { userSettings } from '../users/entities/user_settings.schema';
import { budgets } from '../budgets/entities/budgets.schema';
import { and, eq, sql, sum, count, desc, gte } from 'drizzle-orm';
import { DateUtil } from '../../common/utils/date.util';
import { CurrencyUtil } from '../../common/utils/currency.util';

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

        // C. Seasonality (Current Year to Date)
        const startOfCurrentYear = new Date(now.getFullYear(), 0, 1);

        // We need data starting from the earliest required date.
        // MoM needs startOfLastMonth (which could be prev year if currently Jan).
        // Seasonality needs Jan 1st of current year.
        // Weekend needs last 90 days.

        // Find the earliest date among all requirements
        const dates = [startOfLastMonth, startRollingPrevious, startOfCurrentYear, DateUtil.subDays(now, 90)];
        const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));

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
                    sql`${transactions.date} >= ${earliestDate}`,
                    sql`LOWER(${categories.type}) = 'expense'`
                )
            )
            .groupBy(sql`DATE(${transactions.date})`)
            .orderBy(sql`DATE(${transactions.date})`);

        // Process Data (unchanged helpers)

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

        // 2. MoM Analysis (Unchanged logic using new dailyData)
        // Calendar Month
        const currentMonthTotal = sumRange(startOfCurrentMonth, now);
        const lastMonthTotal = sumRange(startOfLastMonth, endOfLastMonth);
        const calendarChange = lastMonthTotal > 0 ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

        // Rolling 30 Days
        const rollingCurrentTotal = sumRange(startRollingCurrent, now);
        const rollingPreviousTotal = sumRange(startRollingPrevious, new Date(startRollingCurrent.getTime() - 1));
        const rollingChange = rollingPreviousTotal > 0 ? ((rollingCurrentTotal - rollingPreviousTotal) / rollingPreviousTotal) * 100 : 0;

        // 3. Weekday vs Weekend (Unchanged logic)
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

            const allDays = [0, 1, 2, 3, 4, 5, 6];
            const weekdayDays = allDays.filter(day => !weekendDays.includes(day));

            let message = '';
            const ratio = weekdayAvg > 0 ? weekendAvg / weekdayAvg : weekendAvg > 0 ? 999 : 1; // 999 if only weekend spend, 1 if both 0

            if (ratio > 1.5) {
                message = `Your weekends are costly! You spend ${ratio.toFixed(1)}x more than weekdays. Consider planning lower-cost activities to save more.`;
            } else if (ratio > 1.1) {
                message = `You spend slightly more on weekends (${ratio.toFixed(1)}x). This is normal, but keeping an eye on discretionary spending can help boost savings.`;
            } else if (ratio < 0.8) {
                const weekdayRatio = weekendAvg > 0 ? weekdayAvg / weekendAvg : 999;
                message = `Your weekday spending is higher (${weekdayRatio.toFixed(1)}x vs weekends). Check your daily routines for potential savings.`;
            } else {
                message = `Your spending is well-balanced between weekdays and weekends. Great job maintaining a consistent lifestyle!`;
            }

            weekendAnalysis = {
                weekday_avg: Number(weekdayAvg.toFixed(2)),
                weekend_avg: Number(weekendAvg.toFixed(2)),
                weekend_days: weekendDays,
                weekday_days: weekdayDays,
                is_weekend_higher: weekendAvg > weekdayAvg,
                formatted_message: message
            };
        } else {
            weekendAnalysis = {
                status: 'missing_configuration',
                message: 'Please set your weekend days to view this analysis.',
                setup_required: ['weekend_days']
            };
        }

        // 4. Seasonality (Year to Date with Peak & Trend)
        const monthlySeasonalityMap = new Map<string, number>();
        // Only consider data from startOfCurrentYear
        const startYearStr = startOfCurrentYear.toISOString().split('T')[0];

        for (const d of dailyData) {
            if (d.date >= startYearStr) {
                const monthKey = d.date.substring(0, 7); // YYYY-MM
                monthlySeasonalityMap.set(monthKey, (monthlySeasonalityMap.get(monthKey) || 0) + d.amount);
            }
        }

        // Build list from Jan to Current Month
        const seasonality: any[] = [];
        let maxAmount = 0;
        let peakMonthIndex = -1;

        const currentMonthIndex = now.getMonth(); // 0 to 11
        for (let i = 0; i <= currentMonthIndex; i++) {
            // Construct key YYYY-MM
            // Note: using string manipulation to be safe with timezones or just use Date object
            const d = new Date(now.getFullYear(), i, 1);
            const mStr = (d.getMonth() + 1).toString().padStart(2, '0');
            const key = `${d.getFullYear()}-${mStr}`;
            const amount = monthlySeasonalityMap.get(key) || 0;

            if (amount > maxAmount) {
                maxAmount = amount;
                peakMonthIndex = i;
            }

            seasonality.push({
                month: d.toLocaleString('default', { month: 'short' }),
                fullMonth: key,
                amount,
                is_peak: false, // will update later
                trend_percentage: 0 // vs previous month
            });
        }

        // Post-process for Flags & Trends
        seasonality.forEach((item, index) => {
            if (index === peakMonthIndex && item.amount > 0) {
                item.is_peak = true;
            }

            if (index > 0) {
                const prev = seasonality[index - 1].amount;
                if (prev > 0) {
                    item.trend_percentage = Number((((item.amount - prev) / prev) * 100).toFixed(1));
                } else if (item.amount > 0) {
                    item.trend_percentage = 100; // 0 to something
                }
            }
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

    async getEndOfMonthProjection(userId: string) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of month
        const totalDaysInMonth = endOfMonth.getDate();
        const daysElapsed = now.getDate();
        const daysRemaining = totalDaysInMonth - daysElapsed;

        // 1. Get Current Spend (MTD)
        const [spendingResult] = await this.drizzleService.db
            .select({
                totalSpend: sum(transactions.amount).mapWith(Number),
            })
            .from(transactions)
            .leftJoin(categories, eq(transactions.category_id, categories.id))
            .where(
                and(
                    eq(transactions.user_id, userId),
                    sql`${transactions.date} >= ${startOfMonth} AND ${transactions.date} <= ${now}`,
                    sql`LOWER(${categories.type}) = 'expense'`
                )
            );

        const currentSpend = spendingResult?.totalSpend || 0;

        // 2. Get Total Budget for Current Month
        // Use MM-YYYY format
        const currentMonthStr = `${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
        const [budgetResult] = await this.drizzleService.db
            .select({
                totalBudget: sum(budgets.amount).mapWith(Number)
            })
            .from(budgets)
            .where(
                and(
                    eq(budgets.user_id, userId),
                    eq(budgets.month, currentMonthStr)
                )
            );

        const totalBudget = budgetResult?.totalBudget || 0;

        // Fetch User Currency Settings
        const [userSettingsResult] = await this.drizzleService.db
            .select({ currency: userSettings.currency })
            .from(userSettings)
            .where(eq(userSettings.user_id, userId));

        const currencyCode = userSettingsResult?.currency || 'USD';

        const formatCurrency = (amount: number) => {
            const symbol = CurrencyUtil.getSymbol(currencyCode);
            return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        };

        // 3. Projections & Calculations
        const avgDailySpend = daysElapsed > 0 ? currentSpend / daysElapsed : 0;
        const projectedTotal = currentSpend + (daysRemaining * avgDailySpend);

        let projectedSavings = 0;
        let projectedOverspend = 0;
        let pacingIndex = 0;
        let safeDailySpend = 0;
        let coachMessage = '';
        let pacingStatus = 'unknown';

        if (totalBudget > 0) {
            // Variance: Budget - Projected
            const rawVariance = totalBudget - projectedTotal;

            if (rawVariance >= 0) {
                projectedSavings = rawVariance;
                projectedOverspend = 0;
            } else {
                projectedSavings = 0;
                projectedOverspend = Math.abs(rawVariance);
            }

            // Pacing Index calculation
            const timeElapsedPct = daysElapsed / totalDaysInMonth;
            const budgetSpentPct = currentSpend / totalBudget;

            pacingIndex = timeElapsedPct > 0 ? (budgetSpentPct / timeElapsedPct) * 100 : 0;

            // Pacing Status
            if (pacingIndex < 85) {
                pacingStatus = 'saving_heavy';
            } else if (pacingIndex > 115) {
                pacingStatus = 'spending_fast';
            } else {
                pacingStatus = 'on_track';
            }

            // Safe Daily Spend
            const remainingBudget = totalBudget - currentSpend;
            safeDailySpend = remainingBudget > 0 && daysRemaining > 0
                ? remainingBudget / daysRemaining
                : 0;


            // Generate Coach Message
            if (projectedOverspend > 0) {
                coachMessage = `⚠️ You are projected to overspend by ${formatCurrency(projectedOverspend)}. Limit daily spend to ${formatCurrency(safeDailySpend)} to get back on track.`;
            } else if (pacingStatus === 'saving_heavy') {
                coachMessage = `✅ You are significantly under budget! You have a buffer of ${formatCurrency(projectedSavings)}.`;
            } else {
                coachMessage = `👀 You are on track. Keep your daily spend around ${formatCurrency(safeDailySpend)}.`;
            }

        } else {
            coachMessage = `Set a budget to get personalized coaching! Daily spend avg: ${formatCurrency(avgDailySpend)}`;
        }

        let pacingDescription = '';
        if (pacingIndex === 0) pacingDescription = "No budget used yet.";
        else if (pacingIndex < 50) pacingDescription = "Spending is very slow compared to days passed.";
        else if (pacingIndex < 90) pacingDescription = "Spending is slightly slower than days passed.";
        else if (pacingIndex <= 110) pacingDescription = "Spending is on track with days passed.";
        else if (pacingIndex < 150) pacingDescription = "Spending is faster than days passed.";
        else pacingDescription = "Spending is significantly faster than days passed.";

        return {
            status: 'success',
            period: {
                current_date: DateUtil.formatDate(now),
                days_remaining: daysRemaining
            },
            metrics: {
                current_spend: Number(currentSpend.toFixed(2)),
                projected_total: Number(projectedTotal.toFixed(2)),
                total_budget: Number(totalBudget.toFixed(2)),
                projected_savings: Number(projectedSavings.toFixed(2)),
                projected_overspend: Number(projectedOverspend.toFixed(2)),
                pacing_index: Number(pacingIndex.toFixed(0)),
                safe_daily_spend: Number(safeDailySpend.toFixed(2)),
                currency: currencyCode
            },
            insight: {
                message: coachMessage,
                pacing_status: pacingStatus,
                pacing_description: pacingDescription,
                is_over_budget_projected: projectedOverspend > 0
            }
        };
    }

    async getRollingForecast(userId: string) {
        const now = new Date();
        // Look back 90 days for trends
        const startDateHistory = DateUtil.subDays(now, 90);

        // 1. Identify Recurring Commitments (Heuristic: Same Name + Amount >= 3 times in 90 days)
        const rawTransactions = await this.drizzleService.db
            .select({
                name: sql<string>`COALESCE(${transactions.normalized_name}, ${transactions.name})`,
                amount: transactions.amount,
                date: transactions.date
            })
            .from(transactions)
            .leftJoin(categories, eq(transactions.category_id, categories.id))
            .where(
                and(
                    eq(transactions.user_id, userId),
                    sql`${transactions.date} >= ${startDateHistory}`,
                    sql`LOWER(${categories.type}) = 'expense'`
                )
            );

        // Analyze for Recurring
        const frequencyMap = new Map<string, { count: number, amount: number, dates: Date[] }>();

        for (const tx of rawTransactions) {
            // Key: Name + Amount (rounded to integer to handle slight variations?) -> Let's use exact for now or string logic
            // Simple key: Name
            const key = `${tx.name}`;

            if (!frequencyMap.has(key)) {
                frequencyMap.set(key, { count: 0, amount: 0, dates: [] });
            }
            const entry = frequencyMap.get(key)!;
            entry.dates.push(tx.date);
            entry.count += 1;
            entry.amount += tx.amount;
        }

        let recurringTotalMonthly = 0;
        const recurringList: { name: string; average_amount: number }[] = [];

        for (const [key, data] of frequencyMap.entries()) {
            if (data.count >= 3) {
                // Check if dates are spaced out roughly monthly?
                // Skip complex logic for now. Assume if frequency >= 3 in 90 days (~1/month), it's monthly.
                const avgAmount = data.amount / data.count;
                recurringTotalMonthly += avgAmount;
                recurringList.push({ name: key, average_amount: avgAmount });
            }
        }

        // 2. Calculate Non-Recurring (Variable) Spend per Month History
        const totalSpend90Days = rawTransactions.reduce((sum, t) => sum + t.amount, 0);
        const recurringSum90Days = recurringList.reduce((sum, r) => sum + (r.average_amount * 3), 0); // Approx
        const variableSpend90Days = totalSpend90Days - recurringSum90Days;
        const avgVariableMonthly = variableSpend90Days > 0 ? variableSpend90Days / 3 : 0;

        // 3. Predicted Spend for Next 3 Months
        const predictedM1 = recurringTotalMonthly + avgVariableMonthly;
        // Apply trend? If variable spend is increasing, we could scale M2/M3.
        // For now, flat projection + seasonal adjustments if possible.
        const predictedM2 = predictedM1;
        const predictedM3 = predictedM1;

        // 4. Seasonality (Next Month Specific)
        // Check Last Year's Spend for Next Month (e.g. if Now is Dec, look at Jan last year)
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextMonthIndex = nextMonthDate.getMonth();
        const startOfNextMonthLastYear = new Date(now.getFullYear() - 1, nextMonthIndex, 1);
        const endOfNextMonthLastYear = new Date(now.getFullYear() - 1, nextMonthIndex + 1, 0);

        const [lastYearResult] = await this.drizzleService.db
            .select({ total: sum(transactions.amount).mapWith(Number) })
            .from(transactions)
            .where(
                and(
                    eq(transactions.user_id, userId),
                    gte(transactions.date, startOfNextMonthLastYear),
                    sql`${transactions.date} <= ${endOfNextMonthLastYear}`
                )
            );

        const lastYearSpend = lastYearResult?.total || 0;
        let seasonalMessage = '';
        if (lastYearSpend > 0) {
            const difference = lastYearSpend - predictedM1;
            const pctDiff = (difference / predictedM1) * 100;
            const monthName = nextMonthDate.toLocaleString('default', { month: 'long' });

            if (pctDiff > 15) {
                seasonalMessage = `💡 Heads up! Last ${monthName}, you spent ${pctDiff.toFixed(0)}% more than your current average. Plan for a spike!`;
            } else if (pctDiff < -15) {
                seasonalMessage = `Last ${monthName} was a low-spend month for you.`;
            }
        }

        // Coach Message
        const coachMsg = `You have ~$${recurringTotalMonthly.toFixed(0)} in recurring commitments next month.`;

        return {
            status: 'success',
            forecast: {
                next_month: {
                    month: nextMonthDate.toLocaleString('default', { month: 'short' }),
                    predicted_amount: Number(predictedM1.toFixed(2)),
                    recurring_part: Number(recurringTotalMonthly.toFixed(2)),
                    variable_part: Number(avgVariableMonthly.toFixed(2))
                },
                m2: {
                    month: new Date(now.getFullYear(), now.getMonth() + 2, 1).toLocaleString('default', { month: 'short' }),
                    predicted_amount: Number(predictedM2.toFixed(2))
                },
                m3: {
                    month: new Date(now.getFullYear(), now.getMonth() + 3, 1).toLocaleString('default', { month: 'short' }),
                    predicted_amount: Number(predictedM3.toFixed(2))
                }
            },
            recurring_expenses: recurringList.slice(0, 5), // Top 5
            coach_messages: [
                coachMsg,
                seasonalMessage
            ].filter(m => m !== '')
        };
    }
}
