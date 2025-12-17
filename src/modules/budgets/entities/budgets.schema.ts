import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  doublePrecision,
  uuid,
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
});
