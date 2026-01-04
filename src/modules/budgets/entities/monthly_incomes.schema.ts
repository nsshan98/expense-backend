import {
    pgTable,
    text,
    timestamp,
    doublePrecision,
    uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../../users/entities/users.schema';

export const monthlyIncomes = pgTable('monthly_incomes', {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
        .references(() => users.id)
        .notNull(),
    month: text('month').notNull(), // 'MM-YYYY'
    source_name: text('source_name').notNull(),
    amount: doublePrecision('amount').notNull(),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});
