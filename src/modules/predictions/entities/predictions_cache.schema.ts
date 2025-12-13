import {
  pgTable,
  serial,
  timestamp,
  integer,
  numeric,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../../users/entities/users.schema';
import { categories } from '../../categories/entities/categories.schema';

export const predictionsCache = pgTable('predictions_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  category_id: uuid('category_id')
    .references(() => categories.id)
    .notNull(),
  predicted_monthly_spend: numeric('predicted_monthly_spend').notNull(),
  prediction_generated_at: timestamp('prediction_generated_at').defaultNow(),
});
