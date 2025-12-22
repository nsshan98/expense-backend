export class InsightGenerator {
  static generate(
    budgets: any[],
    predictions: any[],
    income: number,
    totalSpend: number = 0,
  ) {
    const insights: any[] = [];

    // Rule 0: Global Financial Health (Expense vs Income)
    if (income > 0 && totalSpend > 0) {
      const globalRatio = (totalSpend / income) * 100;

      if (globalRatio > 100) {
        insights.push({
          type: 'critical',
          text: `Critical: Your total spending (${totalSpend.toFixed(0)}) has exceeded your income (${income.toFixed(0)}).`,
          priorityScore: 25, // Highest priority
          category: { id: 'global', name: 'Overall Financials' }
        });
      } else if (globalRatio >= 90) {
        insights.push({
          type: 'warning',
          text: `Alert: You have spent ${globalRatio.toFixed(0)}% of your monthly income.`,
          priorityScore: 22,
          category: { id: 'global', name: 'Overall Financials' }
        });
      }
    }

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
            category: {
              id: pred.categoryId,
              name: pred.categoryName,
            },
            priorityScore: 10,
          });
        }
      }
    }

    // Rule 2: High spend relative to income (e.g., > 30%)
    // Rule 2: High spend relative to income (e.g., > 30%)
    if (income > 0) {
      for (const pred of predictions) {
        const predictedAmount = Number(pred.predictedAmount);
        if (predictedAmount > income * 0.3) {
          insights.push({
            type: 'highlight',
            text: `Your spending in ${pred.categoryName} is high (${((predictedAmount / income) * 100).toFixed(0)}% of income).`,
            category: {
              id: pred.categoryId,
              name: pred.categoryName,
            },
            priorityScore: 5,
          });
        }
      }
    }

    // Analyze Budget Health with Granular Breakdown
    for (const budget of budgets) {
      const spent = Number(budget.spent_this_month || 0);
      const limit = Number(budget.amount);

      if (limit <= 0) continue;

      const usagePercentage = (spent / limit) * 100;
      const categoryName = budget.category?.name || 'Unknown';
      const categoryId = budget.category_id;

      let insightTitle = '';
      let insightType = '';
      let insightPriority = 0;

      // 1. Over Budget (> 100%)
      if (usagePercentage > 100) {
        insightType = 'critical';
        insightTitle = `Alert: You have exceeded your ${categoryName} budget by ${(spent - limit).toFixed(2)}.`;
        insightPriority = 20;
      }
      // 2. Limit Reached (= 100%)
      else if (Math.abs(usagePercentage - 100) < 0.01) {
        insightType = 'warning';
        insightTitle = `Attention: You have reached exactly 100% of your ${categoryName} budget.`;
        insightPriority = 18;
      }
      // 3. Close to Limit (91% - 99%)
      else if (usagePercentage >= 91) {
        insightType = 'warning';
        insightTitle = `Heads up: You are close to your limit for ${categoryName} (${usagePercentage.toFixed(0)}% used).`;
        insightPriority = 15;
      }
      // 4. Safe Zone (51% - 90%)
      else if (usagePercentage >= 51) {
        insightType = 'info';
        insightTitle = `On Track: Your spending for ${categoryName} is within the safe zone (${usagePercentage.toFixed(0)}% used).`;
        insightPriority = 5;
      }
      // 5. Halfway Mark (= 50%)
      else if (Math.abs(usagePercentage - 50) < 0.01) {
        insightType = 'info';
        insightTitle = `Checkpoint: You have used exactly 50% of your ${categoryName} budget.`;
        insightPriority = 5;
      }
      // 6. Well Under Budget (0% - 49%)
      else {
        insightType = 'positive';
        insightTitle = `Great Job: You are well under budget for ${categoryName} (${usagePercentage.toFixed(0)}% used).`;
      }

      // Priority Score is now Dynamic based on % Usage
      // Higher usage = Higher priority/urgency
      insightPriority = usagePercentage;

      insights.push({
        type: insightType,
        text: insightTitle,
        category: {
          id: categoryId,
          name: categoryName,
        },
        priorityScore: insightPriority,
      });
    }

    // Deduplicate: Keep only the highest priority insight per Category
    const uniqueInsightsMap = new Map<string, any>();

    for (const insight of insights) {
      // Use category ID as key, or name if ID is missing
      const key = insight.category?.id || insight.category?.name;
      if (!key) continue;

      if (!uniqueInsightsMap.has(key)) {
        uniqueInsightsMap.set(key, insight);
      } else {
        // If we already have an insight for this category, check if new one is higher priority
        const existing = uniqueInsightsMap.get(key);
        if (insight.priorityScore > existing.priorityScore) {
          uniqueInsightsMap.set(key, insight);
        }
      }
    }

    return Array.from(uniqueInsightsMap.values())
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 3);
  }
}
