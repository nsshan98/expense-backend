import { Injectable } from '@nestjs/common';
import { BudgetsService } from '../budgets/budgets.service';
import { PredictionsService } from '../predictions/predictions.service';
import { TransactionsService } from '../transactions/transactions.service';
import { InsightGenerator } from './utils/insight.generator';

@Injectable()
export class InsightsService {
  constructor(
    private readonly budgetsService: BudgetsService,
    private readonly predictionsService: PredictionsService,
    private readonly transactionsService: TransactionsService,
  ) { }

  async getInsights(userId: string) {
    const budgets = await this.budgetsService.findAll(userId);
    const predictions = await this.predictionsService.findAll(userId);
    const financials = await this.transactionsService.getMonthlyAggregates(userId);

    // Use calculated income if available, otherwise 0
    const income = financials.income > 0 ? financials.income : 0;

    return InsightGenerator.generate(budgets, predictions, income, financials.expense);
  }

  async getDashboardOverview(userId: string) {
    const [financials, budgets, predictions] = await Promise.all([
      this.transactionsService.getMonthlyAggregates(userId),
      this.budgetsService.findAll(userId),
      this.predictionsService.findAll(userId),
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

    // 2. Top 3 Spend Categories
    const topCategories = financials.topCategories;

    // 3. Budget Status (At-Risk Detection)
    const budgetAlerts = budgets
      .filter((b: any) => b.percentage >= 80)
      .map((b: any) => ({
        category: b.category.name,
        status: b.percentage > 100 ? 'over_budget' : 'at_risk',
        percentage: Number(b.percentage.toFixed(0)),
        over_amount: b.over,
      }))
      .slice(0, 3); // Top 3 alerts

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
      financial_snapshot: snapshot,
      top_spend_categories: topCategories,
      budget_status: budgetAlerts,
      forecast,
      smart_insight: smartInsight,
    };
  }
}
