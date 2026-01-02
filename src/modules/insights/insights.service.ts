import { Injectable } from '@nestjs/common';
import { BudgetsService } from '../budgets/budgets.service';
import { PredictionsService } from '../predictions/predictions.service';
import { TransactionsService } from '../transactions/transactions.service';
import { InsightGenerator } from './utils/insight.generator';
import { DateUtil } from '../../common/utils/date.util';

@Injectable()
export class InsightsService {
  constructor(
    private readonly budgetsService: BudgetsService,
    private readonly predictionsService: PredictionsService,
    private readonly transactionsService: TransactionsService,
  ) { }

  async getInsights(userId: string) {
    const now = new Date();
    const currentMonthStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    const budgets = await this.budgetsService.findAll(userId, currentMonthStr);
    const predictions = await this.predictionsService.findAll(userId);
    const financials = await this.transactionsService.getMonthlyAggregates(userId);

    // Use calculated income if available, otherwise 0
    const income = financials.income > 0 ? financials.income : 0;

    return InsightGenerator.generate(budgets, predictions, income, financials.expense);
  }

  async getDashboardOverview(userId: string) {
    const now = new Date();
    const thirtyDaysAgo = DateUtil.subDays(now, 30);
    const sixtyDaysAgo = DateUtil.subDays(now, 60);

    const [
      financials,
      budgets,
      predictions,
      todaySpend,
      lastMonthSpend,
      dailyTrendData,
      currentPeriodCategorySpend,
      previousPeriodCategorySpend,
    ] = await Promise.all([
      this.transactionsService.getMonthlyAggregates(userId),
      this.budgetsService.findAll(userId, `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`),
      this.predictionsService.findAll(userId),
      this.transactionsService.getTodaySpend(userId),
      this.transactionsService.getLastMonthSpend(userId),
      this.transactionsService.getDailyTransactionSum(
        userId,
        thirtyDaysAgo,
        now,
      ),
      this.transactionsService.getCategorySpendInRange(
        userId,
        thirtyDaysAgo,
        now,
      ),
      this.transactionsService.getCategorySpendInRange(
        userId,
        sixtyDaysAgo,
        thirtyDaysAgo,
      ),
    ]);

    // 1. Financial Snapshot
    const snapshot: any = {
      total_spend: financials.expense,
      savings: financials.net,
      net_cash_flow: financials.net,
    };

    if (financials.income > 0) {
      snapshot.total_income = financials.income;
      snapshot.spend_percentage = Math.round((financials.expense / financials.income) * 100);
    }

    // 1.1 Calculate Trend
    let trendPercentage = 0;
    if (lastMonthSpend > 0) {
      trendPercentage = ((financials.expense - lastMonthSpend) / lastMonthSpend) * 100;
    }

    // 1.2 Calculate Remaining Budget
    // Sum of all budget amounts
    const totalBudgetLimit = budgets.reduce((acc, b: any) => acc + Number(b.amount), 0);
    // Use the actual 'remaining' from budget objects which accounts for spend per category
    const totalRemainingBudget = budgets.reduce((acc, b: any) => acc + Number(b.remaining), 0);

    // Calculate overall percentage based on limits
    let remainingPercentage = 0;
    if (totalBudgetLimit > 0) {
      remainingPercentage = (totalRemainingBudget / totalBudgetLimit) * 100;
    }

    const fast_stats = {
      todays_spend: todaySpend,
      this_month_spend: financials.expense,
      trend_percentage: Number(trendPercentage.toFixed(1)),
      total_remaining_budget: totalRemainingBudget,
      remaining_percentage: Number(remainingPercentage.toFixed(0)),
    };

    // 1.3 Calculate Trend Analysis (Chart + Chips)
    const chart_data: any[] = [];
    const dateMap = new Map<string, number>();

    dailyTrendData.forEach((d) => {
      // normalize date string from DB to YYYY-MM-DD local or just use what we have
      const dateKey = new Date(d.date).toISOString().split('T')[0];
      dateMap.set(dateKey, Number(d.total));
    });

    for (let i = 29; i >= 0; i--) {
      const d = DateUtil.subDays(now, i);
      const dateKey = d.toISOString().split('T')[0];
      // Format: 'Jan 1'
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      chart_data.push({
        date: label,
        fullDate: dateKey,
        amount: dateMap.get(dateKey) || 0
      });
    }

    // Calculate Trending Categories (Chips)
    const previousMap = new Map<string, number>();
    previousPeriodCategorySpend.forEach(c => {
      if (c.name) previousMap.set(c.name, Number(c.total));
    });

    const trending_categories = currentPeriodCategorySpend.map(c => {
      const name = c.name || 'Unknown';
      const currentAmount = Number(c.total);
      const prevAmount = previousMap.get(name) || 0;
      let percentage = 0;

      if (prevAmount > 0) {
        percentage = ((currentAmount - prevAmount) / prevAmount) * 100;
      } else if (currentAmount > 0) {
        percentage = 100; // New spend
      }

      return {
        name: c.name,
        percentage: Number(percentage.toFixed(0)),
        amount: currentAmount
      };
    })
      .filter(c => c.percentage > 0) // Only positive trends
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 2); // Top 2

    const trend_analysis = {
      chart_data,
      trending_categories
    };

    // 2. Top 3 Spend Categories
    const topCategories = financials.topCategories;

    // 3. Budget Status
    const budgetStatus = budgets.map((b: any) => {
      const total = Number(b.amount);
      const spent = Number(b.spent_this_month);
      // Recalculate true percentage without cap
      const truePercentage = total > 0 ? (spent / total) * 100 : 0;

      let status = 'good';
      if (truePercentage >= 100) status = 'over_budget';
      else if (truePercentage >= 80) status = 'at_risk';

      return {
        name: b.category.name,
        spent: spent,
        remaining: b.remaining,
        used_percentage: Number(truePercentage.toFixed(0)),
        limit: total,
        status,
      };
    });

    // 4. Short-Term Forecast
    let forecast = {
      message: 'Keep tracking to see forecasts',
      status: 'neutral',
      amount: 0,
    };

    if (predictions.length > 0) {
      const totalPredictedExec = predictions.reduce(
        (acc: number, p: any) => acc + Number(p.predictedAmount),
        0,
      );

      const income = financials.income; // Can be 0

      if (income > 0) {
        // Normal income-based forecast
        const diff = income - totalPredictedExec;
        if (diff >= 0) {
          forecast = {
            message: `You're on track to save ${diff.toFixed(0)}`,
            status: 'saving',
            amount: diff,
          };
        } else {
          const over = Math.abs(diff);
          forecast = {
            message: `At current pace, you'll overspend by ${over.toFixed(0)}`,
            status: 'overspending',
            amount: over,
          };
        }
      } else {
        // No income recorded
        forecast = {
          message: `Total predicted expense: ${totalPredictedExec.toFixed(0)}`,
          status: 'neutral',
          amount: totalPredictedExec,
        };
      }
    }

    // 5. One Smart Insight
    const incomeForInsights = financials.income;
    const allInsights = InsightGenerator.generate(
      budgets,
      predictions,
      incomeForInsights,
      financials.expense,
    );
    const smartInsight = allInsights.length > 0 ? allInsights[0] : null;

    return {
      fast_stats,
      trend_analysis,
      financial_snapshot: snapshot,
      top_spend_categories: topCategories,
      budget_status: budgetStatus,
      forecast,
      smart_insights: allInsights,
    };
  }
}
