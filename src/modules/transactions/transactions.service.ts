import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { transactions } from './entities/transactions.schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CategoriesService } from '../categories/categories.service';
import { MergeService } from '../merge/merge.service';
import { FeatureAccessService } from '../feature_access/feature_access.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly categoriesService: CategoriesService,
    private readonly mergeService: MergeService,
    private readonly featureAccessService: FeatureAccessService,
    private readonly configService: ConfigService,
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
      const existing = await this.categoriesService.findOrCreateByName(
        userId,
        normalizedName,
      ); // Simple heuristic
      if (existing) {
        categoryId = existing.id;
        suggestedCategory = existing;
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
    return this.drizzleService.db
      .select()
      .from(transactions)
      .where(eq(transactions.user_id, userId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(transactions.date));
  }

  async findOne(id: string, userId: string) {
    const [transaction] = await this.drizzleService.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.user_id, userId)));
    return transaction;
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
    return transaction;
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
