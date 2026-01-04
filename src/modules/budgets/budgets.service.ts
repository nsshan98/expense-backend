import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { budgets } from './entities/budgets.schema';
import { transactions } from '../transactions/entities/transactions.schema';
import { eq, and, sql, sum } from 'drizzle-orm';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { FeatureAccessService } from '../feature_access/feature_access.service';
import { CategoriesService } from '../categories/categories.service';
import { categories } from '../categories/entities/categories.schema';
import { monthlySavingsGoals } from './entities/monthly_savings_goals.schema';
import { monthlyIncomes } from './entities/monthly_incomes.schema';
import { SetSavingsGoalDto } from './dto/savings-goal.dto';
import { AddIncomeDto, CreateIncomeDto } from './dto/income.dto';
import { CreateMonthlyPlanDto } from './dto/create-monthly-plan.dto';

@Injectable()
export class BudgetsService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly featureAccessService: FeatureAccessService,
    private readonly categoriesService: CategoriesService,
  ) { }

  async bulkCreate(userId: string, dataList: CreateBudgetDto[]) {
    // 1. Check Limits per month
    // We group the incoming requests by month to check limits for each target month separately.
    const now = new Date();
    const defaultMonth = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    const itemsByMonth: Record<string, number> = {};

    for (const data of dataList) {
      const month = data.month || defaultMonth;
      itemsByMonth[month] = (itemsByMonth[month] || 0) + 1;
    }

    for (const [month, countToAdd] of Object.entries(itemsByMonth)) {
      const [result] = await this.drizzleService.db
        .select({ count: sql`count(*)` })
        .from(budgets)
        .where(
          and(
            eq(budgets.user_id, userId),
            eq(budgets.month, month)
          )
        );

      const currentCount = Number(result?.count || 0);
      await this.featureAccessService.checkLimit(userId, 'max_budgets', currentCount + countToAdd);
    }

    const inputsToProcess: any[] = [];
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

    try {
      const createdBudgets = await this.drizzleService.db
        .insert(budgets)
        .values(inputsToProcess)
        .returning();

      return createdBudgets;
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException(
          'One or more budgets already exist for the selected month and category. Please update them instead.',
        );
      }
      throw error;
    }
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

  // --- Savings & Income Management ---

  async setSavingsGoal(userId: string, dto: SetSavingsGoalDto) {
    const { month, amount } = dto;

    // Check if goal exists for this month
    const [existing] = await this.drizzleService.db
      .select()
      .from(monthlySavingsGoals)
      .where(and(
        eq(monthlySavingsGoals.user_id, userId),
        eq(monthlySavingsGoals.month, month)
      ));

    if (existing) {
      const [updated] = await this.drizzleService.db
        .update(monthlySavingsGoals)
        .set({ target_amount: amount })
        .where(eq(monthlySavingsGoals.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await this.drizzleService.db
        .insert(monthlySavingsGoals)
        .values({
          user_id: userId,
          month,
          target_amount: amount,
        })
        .returning();
      return created;
    }
  }

  async getSavingsGoal(userId: string, month: string) {
    const [goal] = await this.drizzleService.db
      .select()
      .from(monthlySavingsGoals)
      .where(and(
        eq(monthlySavingsGoals.user_id, userId),
        eq(monthlySavingsGoals.month, month)
      ));
    return goal || null;
  }

  async removeSavingsGoal(userId: string, goalId: string) {
    const [deleted] = await this.drizzleService.db
      .delete(monthlySavingsGoals)
      .where(and(
        eq(monthlySavingsGoals.id, goalId),
        eq(monthlySavingsGoals.user_id, userId)
      ))
      .returning();

    if (!deleted) {
      throw new NotFoundException('Savings goal not found');
    }
    return { message: 'Savings goal deleted successfully' };
  }

  async addIncome(userId: string, dto: AddIncomeDto) {
    const incomeList = dto.incomes.map(inc => ({
      user_id: userId,
      month: dto.month,
      source_name: inc.source,
      amount: inc.amount,
    }));

    if (incomeList.length === 0) return [];

    const created = await this.drizzleService.db
      .insert(monthlyIncomes)
      .values(incomeList)
      .returning();
    return created;
  }

  async removeIncome(userId: string, incomeId: string) {
    const [deleted] = await this.drizzleService.db
      .delete(monthlyIncomes)
      .where(and(
        eq(monthlyIncomes.id, incomeId),
        eq(monthlyIncomes.user_id, userId)
      ))
      .returning();

    if (!deleted) {
      throw new NotFoundException('Income entry not found');
    }
    return deleted;
  }

  async getIncomes(userId: string, month: string) {
    return this.drizzleService.db
      .select()
      .from(monthlyIncomes)
      .where(and(
        eq(monthlyIncomes.user_id, userId),
        eq(monthlyIncomes.month, month)
      ));
  }

  async createMonthlyPlan(userId: string, dto: CreateMonthlyPlanDto) {
    const { month, incomes, savings_goal, budgets: budgetList } = dto;

    // 1. Validation: Financial Feasibility
    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    const totalBudgeted = budgetList.reduce((sum, b) => sum + b.amount, 0);
    const maxAllowableBudget = totalIncome - savings_goal;

    if (totalBudgeted > maxAllowableBudget) {
      const excess = totalBudgeted - maxAllowableBudget;
      throw new BadRequestException(
        `Your planned budgets (${totalBudgeted}) exceed your available funds (${maxAllowableBudget}) after accounting for your savings goal of ${savings_goal}. You are over by ${excess}.`
      );
    }

    // 2. Execute Transaction
    return this.drizzleService.db.transaction(async (tx) => {
      // A. Upsert Savings Goal
      // Delete existing for this month to replace (simplest upsert)
      await tx
        .delete(monthlySavingsGoals)
        .where(and(eq(monthlySavingsGoals.user_id, userId), eq(monthlySavingsGoals.month, month)));

      await tx.insert(monthlySavingsGoals).values({
        user_id: userId,
        month,
        target_amount: savings_goal,
      });

      // B. Upsert Incomes
      // Delete existing for this month
      await tx
        .delete(monthlyIncomes)
        .where(and(eq(monthlyIncomes.user_id, userId), eq(monthlyIncomes.month, month)));

      if (incomes.length > 0) {
        await tx.insert(monthlyIncomes).values(
          incomes.map(inc => ({
            user_id: userId,
            month,
            source_name: inc.source,
            amount: inc.amount,
          }))
        );
      }

      // C. Process Budgets
      // We'll reuse logic from bulkCreate but adapted for transaction context
      // Or we can just handle it here directly for atomicity.
      // Important: bulkCreate handles category creation. We should ideally refactor to reuse, but for now copying the category logic is safer for transaction scope.

      const inputsToProcess: any[] = [];
      const newlyCreatedCategories = new Map<string, string>();

      for (const data of budgetList) {
        let categoryId = data.categoryId;

        if (!categoryId) {
          if (!data.categoryName || !data.categoryType) {
            throw new BadRequestException('Category Name and Type are required if Category ID is not provided');
          }
          const lowerName = data.categoryName.toLowerCase();

          if (newlyCreatedCategories.has(lowerName)) {
            categoryId = newlyCreatedCategories.get(lowerName);
          } else {
            // Check DB using our transaction 'tx' is tricky if we use external service... 
            // We use tx for all DB ops.

            // Find category
            const [existingCategory] = await tx
              .select()
              .from(categories)
              .where(and(eq(categories.user_id, userId), eq(categories.name, data.categoryName)));

            if (existingCategory) {
              categoryId = existingCategory.id;
              newlyCreatedCategories.set(lowerName, categoryId);
            } else {
              // Create
              const [newCategory] = await tx
                .insert(categories)
                .values({
                  user_id: userId,
                  name: data.categoryName,
                  type: data.categoryType as any,
                })
                .returning();
              categoryId = newCategory.id;
              newlyCreatedCategories.set(lowerName, categoryId);
            }
          }
        }

        inputsToProcess.push({
          user_id: userId,
          category_id: categoryId,
          amount: data.amount,
          period: 'monthly',
          month: month,
        });
      }

      // Upsert Budgets: We can't easily upsert with uniqueIndex conflict in drizzle efficiently locally without 'onConflictDoUpdate' which might be complex with 'month'.
      // Strategy: Delete existing budgets for these categories in this month and insert new.
      // Or just fail if exist? bulkCreate throws Conflict.
      // Let's replace: If user is "Planning" the month, they might be overwriting.
      // Let's check for existing and delete to be safe (Full Overwrite Mode for simplicity of "Plan") OR
      // just insert and let it fail.
      // BETTER: Insert and on conflict update amount.

      if (inputsToProcess.length > 0) {
        for (const input of inputsToProcess) {
          await tx
            .insert(budgets)
            .values(input)
            .onConflictDoUpdate({
              target: [budgets.user_id, budgets.category_id, budgets.month],
              set: { amount: input.amount }
            });
        }
      }

      return { status: 'success', message: 'Monthly plan created successfully' };
    });
  }
}
