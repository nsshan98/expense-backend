import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  doublePrecision,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from '../../users/entities/users.schema';
import { categories } from '../../categories/entities/categories.schema';

export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  category_id: uuid('category_id')
    .references(() => categories.id)
    .notNull(),
  amount: doublePrecision('amount').notNull(),
  month: text('month'), // 'MM-YYYY'
  period: text('period').default('monthly'), // monthly, yearly
  created_at: timestamp('created_at').defaultNow(),
},
  (t) => ({
    // Ensure one budget per category per month for a user
    unq_user_cat_month: uniqueIndex('unq_user_cat_month').on(t.user_id, t.category_id, t.month),
  }),
);
