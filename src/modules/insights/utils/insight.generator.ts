export class InsightGenerator {
  static generate(
    budgets: any[],
    predictions: any[],
    income: number = 5000, // Default or fetched from user profile if available
  ) {
    const insights: any[] = [];

    // Rule 1: Predicted > Budget
    for (const pred of predictions) {
      const budget = budgets.find((b) => b.category_id === pred.categoryId);
      if (budget) {
        const predictedAmount = Number(pred.predictedAmount);
        const budgetAmount = Number(budget.amount);
        if (predictedAmount > budgetAmount) {
          insights.push({
            type: 'warning',
            text: `You are predicted to exceed your ${pred.categoryName} budget by ${(predictedAmount - budgetAmount).toFixed(2)}.`,
            categoryId: pred.categoryId,
            priorityScore: 10,
          });
        }
      }
    }

    // Rule 2: High spend relative to income (e.g., > 30%)
    for (const pred of predictions) {
      const predictedAmount = Number(pred.predictedAmount);
      if (predictedAmount > income * 0.3) {
        insights.push({
          type: 'highlight',
          text: `Your spending in ${pred.categoryName} is high (${((predictedAmount / income) * 100).toFixed(0)}% of income).`,
          categoryId: pred.categoryId,
          priorityScore: 5,
        });
      }
    }

    return insights
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 3);
  }
}
