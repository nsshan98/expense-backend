import { pgTable, serial, text, timestamp, integer, uuid } from 'drizzle-orm/pg-core';
import { users } from '../../users/entities/users.schema';

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  user_id: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  created_at: timestamp('created_at').defaultNow(),
});
