import { Injectable } from '@nestjs/common';
import { BudgetsService } from '../budgets/budgets.service';
import { PredictionsService } from '../predictions/predictions.service';
import { InsightGenerator } from './utils/insight.generator';

@Injectable()
export class InsightsService {
  constructor(
    private readonly budgetsService: BudgetsService,
    private readonly predictionsService: PredictionsService,
  ) { }

  async getInsights(userId: string) {
    const budgets = await this.budgetsService.findAll(userId);
    const predictions = await this.predictionsService.findAll(userId);

    // In a real app, we'd fetch user income from UsersService or a Settings table.
    // For now, we assume a default or pass 0 to skip income-based rules if not available.
    const income = 5000;

    return InsightGenerator.generate(budgets, predictions, income);
  }
}
