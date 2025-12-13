import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/db.service';
import { transactions } from '../transactions/entities/transactions.schema';
import { mergeMap } from './entities/merge_map.schema';
import { eq, and, sql } from 'drizzle-orm';
import { FuzzyUtil } from './utils/fuzzy.util';

@Injectable()
export class MergeService {
  constructor(private readonly drizzleService: DrizzleService) { }

  async getSuggestions(userId: string, name: string) {
    // Get distinct normalized names for user
    const result = await this.drizzleService.db
      .selectDistinct({ name: transactions.normalized_name })
      .from(transactions)
      .where(eq(transactions.user_id, userId));

    const names = result
      .map((r) => r.name)
      .filter((n) => n !== null) as string[];
    const matches = FuzzyUtil.search(names, name);
    return matches.map((m) => m.item);
  }

  async applyMerge(userId: string, sourceNames: string[], targetName: string) {
    return this.drizzleService.db.transaction(async (tx) => {
      // Update transactions
      await tx
        .update(transactions)
        .set({ normalized_name: targetName })
        .where(
          and(
            eq(transactions.user_id, userId),
            sql`${transactions.normalized_name} IN ${sourceNames}`,
          ),
        );

      // Record merge map
      for (const source of sourceNames) {
        await tx.insert(mergeMap).values({
          user_id: userId,
          source_name: source,
          target_name: targetName,
        });
      }
      return { success: true };
    });
  }
}
