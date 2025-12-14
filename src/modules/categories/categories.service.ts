import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { categories } from './entities/categories.schema';
import { transactions } from '../transactions/entities/transactions.schema';
import { eq, and } from 'drizzle-orm';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly drizzleService: DrizzleService) { }

  async create(userId: string, data: CreateCategoryDto) {
    // Enforce unique per user (lowercase)
    const existing = await this.findOrCreateByName(userId, data.name);
    if (existing) {
      // If it already exists, we might just return it or throw conflict if strict.
      // The spec says "findOrCreateByName", but also "POST /categories".
      // Usually POST implies creation. If it exists, let's throw conflict or return existing.
      // Let's check if it exists first.
      const [found] = await this.drizzleService.db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.user_id, userId),
            eq(categories.name, data.name.toLowerCase()),
          ),
        );
      if (found) {
        throw new ConflictException('Category already exists');
      }
    }

    const [category] = await this.drizzleService.db
      .insert(categories)
      .values({ ...data, name: data.name.toLowerCase(), user_id: userId })
      .returning();
    return category;
  }

  async findOrCreateByName(userId: string, name: string) {
    const lowerName = name.toLowerCase();
    const [existing] = await this.drizzleService.db
      .select()
      .from(categories)
      .where(
        and(eq(categories.user_id, userId), eq(categories.name, lowerName)),
      );

    if (existing) return existing;
    return null;
  }

  async findAll(userId: string) {
    return this.drizzleService.db
      .select()
      .from(categories)
      .where(eq(categories.user_id, userId));
  }

  async findOne(id: string, userId: string) {
    const [category] = await this.drizzleService.db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.user_id, userId)));

    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(id: string, userId: string, data: any) {
    const [category] = await this.drizzleService.db
      .update(categories)
      .set(data)
      .where(and(eq(categories.id, id), eq(categories.user_id, userId)))
      .returning();

    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async remove(id: string, userId: string, force = false) {
    // Check ownership and existence first to avoid leaking transaction info or giving wrong error
    const existing = await this.findOne(id, userId); // Will throw NotFoundException if not found/owned
    if (!existing) {
      // Should technically be caught by findOne but safe guard
      throw new NotFoundException('Category not found');
    }

    // Check for transactions
    const [tx] = await this.drizzleService.db
      .select()
      .from(transactions)
      .where(eq(transactions.category_id, id))
      .limit(1);

    if (tx && !force) {
      throw new BadRequestException(
        'Cannot delete category with existing transactions',
      );
    }

    const [category] = await this.drizzleService.db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.user_id, userId)))
      .returning();

    // existing check above covers it, but redundant check doesn't hurt
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return {
      message: 'Category deleted successfully',
    };
  }
}
