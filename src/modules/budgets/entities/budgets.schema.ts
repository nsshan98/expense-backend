import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  numeric,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../../users/entities/users.schema';
import { categories } from '../../categories/entities/categories.schema';

export const budgets = pgTable('budgets', {
  id: serial('id').primaryKey(),
  user_id: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  category_id: integer('category_id')
    .references(() => categories.id)
    .notNull(),
  amount: numeric('amount').notNull(),
  period: text('period').default('monthly'), // monthly, yearly
  created_at: timestamp('created_at').defaultNow(),
});
