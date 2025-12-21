import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { budgets } from './entities/budgets.schema';
import { transactions } from '../transactions/entities/transactions.schema';
import { eq, and, sql, sum } from 'drizzle-orm';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { FeatureAccessService } from '../feature_access/feature_access.service';
import { CategoriesService } from '../categories/categories.service';
import { categories } from '../categories/entities/categories.schema';

@Injectable()
export class BudgetsService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly featureAccessService: FeatureAccessService,
    private readonly categoriesService: CategoriesService,
  ) { }

  async bulkCreate(userId: string, dataList: CreateBudgetDto[]) {
    // 1. Check Limits for the total batch
    const [result] = await this.drizzleService.db
      .select({ count: sql`count(*)` })
      .from(budgets)
      .where(eq(budgets.user_id, userId));

    const currentCount = Number(result.count);
    // Determine the total *new* budgets we're adding.
    // If we were doing updates, this would be different, but this is create-only.
    await this.featureAccessService.checkLimit(userId, 'max_budgets', currentCount + dataList.length);

    const inputsToProcess: any[] = [];
    const now = new Date();
    // Cache for new categories within this transaction to avoid duplicates
    const newlyCreatedCategories = new Map<string, string>(); // Name -> ID

    for (const data of dataList) {
      let categoryId = data.categoryId;

      if (!categoryId) {
        if (!data.categoryName || !data.categoryType) {
          throw new BadRequestException('Category Name and Type are required if Category ID is not provided');
        }

        const lowerName = data.categoryName.toLowerCase();

        // Check if we already created it in this batch
        if (newlyCreatedCategories.has(lowerName)) {
          categoryId = newlyCreatedCategories.get(lowerName);
        } else {
          // Check DB
          const existingCategory = await this.categoriesService.findOrCreateByName(userId, data.categoryName);
          if (existingCategory) {
            categoryId = existingCategory.id;
            newlyCreatedCategories.set(lowerName, categoryId);
          } else {
            // Create new
            const newCategory = await this.categoriesService.create(userId, {
              name: data.categoryName,
              type: data.categoryType,
            });
            categoryId = newCategory.id;
            newlyCreatedCategories.set(lowerName, categoryId);
          }
        }
      }

      const month = data.month || `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

      inputsToProcess.push({
        user_id: userId,
        category_id: categoryId,
        amount: data.amount,
        period: 'monthly',
        month: month,
      });
    }

    if (inputsToProcess.length === 0) return [];

    const createdBudgets = await this.drizzleService.db
      .insert(budgets)
      .values(inputsToProcess)
      .returning();

    return createdBudgets;
  }

  async findAll(userId: string, month?: string) {
    // Correct approach using variable for conditions
    const conditions = [eq(budgets.user_id, userId)];
    if (month) {
      conditions.push(eq(budgets.month, month));
    }

    const finalQuery = this.drizzleService.db
      .select({
        id: budgets.id,
        user_id: budgets.user_id,
        category_id: budgets.category_id,
        category_name: categories.name,
        category_type: categories.type,
        amount: budgets.amount,
        period: budgets.period,
        month: budgets.month,
        created_at: budgets.created_at,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.category_id, categories.id))
      .where(and(...conditions));

    const userBudgets = await finalQuery;

    return this.getBudgetProgress(userId, userBudgets);
  }

  async findOne(id: string, userId: string) {
    const [budget] = await this.drizzleService.db
      .select({
        id: budgets.id,
        user_id: budgets.user_id,
        category_id: budgets.category_id,
        amount: budgets.amount,
        period: budgets.period,
        month: budgets.month,
        created_at: budgets.created_at,
        category_name: categories.name,
        category_type: categories.type,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.category_id, categories.id))
      .where(and(eq(budgets.id, id), eq(budgets.user_id, userId)));

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    const result = await this.getBudgetProgress(userId, [budget]);
    return result[0];
  }

  async update(id: string, userId: string, data: any) {
    const updateData: any = {};
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.month !== undefined) updateData.month = data.month;
    if (data.categoryId !== undefined) {
      await this.categoriesService.findOne(data.categoryId, userId);
      updateData.category_id = data.categoryId;
    }

    if (Object.keys(updateData).length === 0) {
      return this.findOne(id, userId);
    }

    const [budget] = await this.drizzleService.db
      .update(budgets)
      .set(updateData)
      .where(and(eq(budgets.id, id), eq(budgets.user_id, userId)))
      .returning();

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    return budget;
  }

  async remove(id: string, userId: string) {
    const [budget] = await this.drizzleService.db
      .delete(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.user_id, userId)))
      .returning();

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    return {
      message: 'Budget deleted successfully',
    };
  }

  async getBudgetProgress(userId: string, budgetList: any[]) {
    const progressList: any[] = [];

    for (const budget of budgetList) {
      // Determine date range based on budget.month (MM-YYYY)
      // If budget.month is missing, fallback to current month?
      // Assuming budget.month exists if we created it recently.

      let monStr = budget.month;
      if (!monStr) {
        const now = new Date();
        monStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
      }

      const [month, year] = monStr.split('-').map(Number);

      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999); // last day of month

      // We need to query transactions for this category in this date range
      // We must cast date to timestamp or use string comparison if stored as timestamp

      const [result] = await this.drizzleService.db
        .select({ total: sum(transactions.amount) })
        .from(transactions)
        .where(
          and(
            eq(transactions.user_id, userId),
            eq(transactions.category_id, budget.category_id),
            sql`${transactions.date} >= ${startOfMonth} AND ${transactions.date} <= ${endOfMonth}`,
          ),
        );

      const spent = Number(result?.total || 0);
      const total = Number(budget.amount);
      let remaining = total - spent;
      let over = 0;

      if (remaining < 0) {
        over = Math.abs(remaining);
        remaining = 0;
      }

      const percentage = total > 0 ? (spent / total) * 100 : 0;

      const { user_id, category_id, category_name, category_type, ...budgetData } = budget;

      progressList.push({
        ...budgetData,
        category: {
          id: category_id,
          name: category_name,
          type: category_type,
        },
        spent_this_month: spent,
        remaining,
        over,
        percentage: Math.min(percentage, 100),
      });
    }
    return progressList;
  }
}
