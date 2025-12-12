import { pgTable, serial, text, timestamp, integer, uuid } from 'drizzle-orm/pg-core';
import { users } from '../../users/entities/users.schema';

export const mergeMap = pgTable('merge_map', {
  id: serial('id').primaryKey(),
  user_id: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  source_name: text('source_name').notNull(),
  target_name: text('target_name').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});
