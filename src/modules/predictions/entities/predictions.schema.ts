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

export const predictions = pgTable('predictions', {
  id: serial('id').primaryKey(),
  user_id: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  category_id: integer('category_id')
    .references(() => categories.id)
    .notNull(),
  predicted_amount: numeric('predicted_amount').notNull(),
  month: text('month').notNull(), // YYYY-MM
  created_at: timestamp('created_at').defaultNow(),
});
