import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { budgets } from './entities/budgets.schema';
import { transactions } from '../transactions/entities/transactions.schema';
import { eq, and, sql, sum } from 'drizzle-orm';
import { CreateBudgetDto } from './dto/create-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private readonly drizzleService: DrizzleService) { }

  async create(userId: string, data: CreateBudgetDto) {
    const [budget] = await this.drizzleService.db
      .insert(budgets)
      .values({
        user_id: userId,
        category_id: data.categoryId,
        amount: data.amount,
        period: 'monthly',
      })
      .returning();
    return budget;
  }

  async findAll(userId: string) {
    const userBudgets = await this.drizzleService.db
      .select()
      .from(budgets)
      .where(eq(budgets.user_id, userId));

    return this.getBudgetProgress(userId, userBudgets);
  }

  async findOne(id: string, userId: string) {
    const [budget] = await this.drizzleService.db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.user_id, userId)));
    return budget;
  }

  async update(id: string, userId: string, data: any) {
    const [budget] = await this.drizzleService.db
      .update(budgets)
      .set(data)
      .where(and(eq(budgets.id, id), eq(budgets.user_id, userId)))
      .returning();
    return budget;
  }

  async remove(id: string, userId: string) {
    const [budget] = await this.drizzleService.db
      .delete(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.user_id, userId)))
      .returning();
    return budget;
  }

  async getBudgetProgress(userId: string, budgetList: any[]) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const progressList: any[] = [];

    for (const budget of budgetList) {
      const [result] = await this.drizzleService.db
        .select({ total: sum(transactions.amount) })
        .from(transactions)
        .where(
          and(
            eq(transactions.user_id, userId),
            eq(transactions.category_id, budget.category_id),
            sql`${transactions.date} >= ${startOfMonth}`,
          ),
        );

      const spent = Number(result?.total || 0);
      const total = Number(budget.amount);
      const remaining = total - spent;
      const percentage = total > 0 ? (spent / total) * 100 : 0;

      progressList.push({
        ...budget,
        spentThisMonth: spent,
        remaining,
        percentage: Math.min(percentage, 100),
      });
    }
    return progressList;
  }
}
