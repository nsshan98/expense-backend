import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  doublePrecision,
  index,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../../users/entities/users.schema';
import { categories } from '../../categories/entities/categories.schema';

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    name: text('name').notNull(),
    normalized_name: text('normalized_name'),
    category_id: uuid('category_id').references(() => categories.id),
    amount: doublePrecision('amount').notNull(),
    date: timestamp('date').notNull(),
    note: text('note'),
    created_at: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    userIdDateIdx: index('user_id_date_idx').on(t.user_id, t.date),
    userIdNormalizedNameIdx: index('user_id_normalized_name_idx').on(
      t.user_id,
      t.normalized_name,
    ),
  }),
);
