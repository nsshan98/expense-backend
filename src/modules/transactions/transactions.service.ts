import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { transactions } from './entities/transactions.schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { DateUtil } from '../../common/utils/date.util';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CategoriesService } from '../categories/categories.service';
import { categories } from '../categories/entities/categories.schema';
import { MergeService } from '../merge/merge.service';
import { FeatureAccessService } from '../feature_access/feature_access.service';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai/ai.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly categoriesService: CategoriesService,
    private readonly mergeService: MergeService,
    private readonly featureAccessService: FeatureAccessService,
    private readonly configService: ConfigService,
    private readonly aiService: AiService,
  ) { }

  async create(userId: string, data: CreateTransactionDto) {
    // 1. Check limits
    const hasPremium = await this.featureAccessService.hasAccess(
      userId,
      'premium',
    );
    if (!hasPremium) {
      const limit =
        this.configService.get<number>('FREE_TX_LIMIT_PER_MONTH') || 100;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [result] = await this.drizzleService.db
        .select({ count: count() })
        .from(transactions)
        .where(
          and(
            eq(transactions.user_id, userId),
            sql`${transactions.date} >= ${startOfMonth}`,
          ),
        );

      if (result.count >= limit) {
        throw new ForbiddenException('Monthly transaction limit reached');
      }
    }

    // 2. Normalize name
    const normalizedName = data.name.trim().toLowerCase();

    // 3. Auto-suggest category if not provided
    let categoryId = data.categoryId;
    let suggestedCategory: any = null;
    if (!categoryId) {
      // 3.1. Try exact match first
      const existing = await this.categoriesService.findOrCreateByName(
        userId,
        normalizedName,
      );
      if (existing) {
        categoryId = existing.id;
        suggestedCategory = existing;
      } else {
        // 3.2. Try AI prediction
        const categories = await this.categoriesService.findAll(userId);
        const predictedId = await this.aiService.predictCategory(
          data.name,
          categories
        );

        if (predictedId) {
          categoryId = predictedId;
          // We found an ID, but we need the full object for response consistency if we want to return 'suggestedCategory'
          // although logic below doesn't seemingly use suggestedCategory for anything other than returning it.
          suggestedCategory = categories.find((c) => c.id === predictedId);
        }
      }
    }

    // 4. Fuzzy matches
    const fuzzyMatches = await this.mergeService.getSuggestions(
      userId,
      normalizedName,
    );

    // 5. Save
    const [transaction] = await this.drizzleService.db
      .insert(transactions)
      .values({
        ...data,
        amount: data.amount,
        user_id: userId,
        normalized_name: normalizedName,
        category_id: categoryId,
        date: data.date ? new Date(data.date) : new Date(),
      })
      .returning();

    return { transaction, suggestedCategory, fuzzyMatches };
  }

  async findAll(userId: string, limit = 10, offset = 0) {
    const results = await this.drizzleService.db
      .select({
        id: transactions.id,
        user_id: transactions.user_id,
        name: transactions.name,
        normalized_name: transactions.normalized_name,
        amount: transactions.amount,
        date: transactions.date,
        note: transactions.note,
        created_at: transactions.created_at,
        category: {
          id: categories.id,
          name: categories.name,
          type: categories.type,
        },
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.category_id, categories.id))
      .where(eq(transactions.user_id, userId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(transactions.date));

    return results;
  }

  async findOne(id: string, userId: string) {
    const [result] = await this.drizzleService.db
      .select({
        id: transactions.id,
        user_id: transactions.user_id,
        name: transactions.name,
        normalized_name: transactions.normalized_name,
        amount: transactions.amount,
        date: transactions.date,
        note: transactions.note,
        created_at: transactions.created_at,
        category: {
          id: categories.id,
          name: categories.name,
          type: categories.type,
        },
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.category_id, categories.id))
      .where(and(eq(transactions.id, id), eq(transactions.user_id, userId)));
    return result;
  }

  async update(id: string, userId: string, data: UpdateTransactionDto) {
    await this.checkOwnership(id, userId);

    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
      updateData.normalized_name = data.name.trim().toLowerCase();
    }
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.categoryId !== undefined) {
      await this.categoriesService.findOne(data.categoryId, userId);
      updateData.category_id = data.categoryId;
    }
    if (data.note !== undefined) updateData.note = data.note;

    if (Object.keys(updateData).length === 0) {
      return this.findOne(id, userId);
    }

    const [transaction] = await this.drizzleService.db
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, id))
      .returning();

    let category: any = null;
    if (transaction.category_id) {
      const [cat] = await this.drizzleService.db
        .select({
          id: categories.id,
          name: categories.name,
          type: categories.type,
        })
        .from(categories)
        .where(eq(categories.id, transaction.category_id));
      category = cat;
    }

    const { category_id, ...transactionData } = transaction;
    return { ...transactionData, category };
  }

  async remove(id: string, userId: string) {
    await this.checkOwnership(id, userId);

    const [transaction] = await this.drizzleService.db
      .delete(transactions)
      .where(eq(transactions.id, id))
      .returning();
    return {
      message: 'Transaction deleted successfully',
    };
  }

  async getMonthlyAggregates(userId: string) {
    const startOfMonth = DateUtil.startOfMonth();
    const endOfMonth = DateUtil.endOfMonth();

    const txs = await this.drizzleService.db
      .select({
        amount: transactions.amount,
        type: categories.type,
        categoryName: categories.name,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.category_id, categories.id))
      .where(
        and(
          eq(transactions.user_id, userId),
          sql`${transactions.date} >= ${startOfMonth} AND ${transactions.date} <= ${endOfMonth}`,
        ),
      );

    let income = 0;
    let expense = 0;
    const categorySpend = new Map<string, number>();

    for (const tx of txs) {
      const amount = Number(tx.amount);
      const type = tx.type ? tx.type.toLowerCase().trim() : '';

      if (type === 'income') {
        income += amount;
      } else if (type === 'expense') {
        expense += amount;
        const cat = tx.categoryName || 'Uncategorized';
        // Only count positive amounts as spend
        if (amount > 0) {
          categorySpend.set(cat, (categorySpend.get(cat) || 0) + amount);
        }
      }
    }

    const topCategories = Array.from(categorySpend.entries())
      .map(([name, amount]) => ({ name, amount, percentage: 0 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    const totalForCalc = Math.max(expense, 1);
    topCategories.forEach((c) => {
      c.percentage = Number(((c.amount / totalForCalc) * 100).toFixed(1));
    });

    return {
      income,
      expense,
      net: income - expense,
      topCategories,
    };
  }

  private async checkOwnership(transactionId: string, userId: string) {
    const [transaction] = await this.drizzleService.db
      .select({ userId: transactions.user_id })
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.userId !== userId) {
      throw new ForbiddenException('You are not allowed to access this transaction');
    }
  }
}
