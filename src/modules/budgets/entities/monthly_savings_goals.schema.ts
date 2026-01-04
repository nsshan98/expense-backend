import {
    pgTable,
    text,
    timestamp,
    doublePrecision,
    uuid,
    uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from '../../users/entities/users.schema';

export const monthlySavingsGoals = pgTable('monthly_savings_goals', {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
        .references(() => users.id)
        .notNull(),
    month: text('month').notNull(), // 'MM-YYYY'
    target_amount: doublePrecision('target_amount').notNull(),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
},
    (t) => ({
        unq_user_month_goal: uniqueIndex('unq_user_month_goal').on(t.user_id, t.month),
    }),
);
