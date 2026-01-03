import {
    pgTable,
    text,
    timestamp,
    doublePrecision,
    uuid,
    boolean,
    integer,
    index,
} from 'drizzle-orm/pg-core';
import { users } from '../../users/entities/users.schema';
import { categories } from '../../categories/entities/categories.schema';

export const subscriptions = pgTable(
    'subscriptions',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        user_id: uuid('user_id')
            .references(() => users.id)
            .notNull(),
        name: text('name').notNull(),
        amount: doublePrecision('amount').notNull(),
        currency: text('currency'),
        global_amount: doublePrecision('global_amount'),
        global_currency: text('global_currency'),
        billing_cycle: text('billing_cycle').notNull(), // 'monthly', 'yearly', 'weekly', 'daily'
        next_renewal_date: timestamp('next_renewal_date').notNull(),
        category_id: uuid('category_id')
            .references(() => categories.id)
            .notNull(),

        alert_days: integer('alert_days'), // Override for this subscription, null means use user default
        is_active: boolean('is_active').default(true),
        description: text('description'),
        created_at: timestamp('created_at').defaultNow(),
        updated_at: timestamp('updated_at').defaultNow(),
    },
    (t) => ({
        userIdIdx: index('subs_user_id_idx').on(t.user_id),
        renewalDateIdx: index('subs_renewal_date_idx').on(t.next_renewal_date),
    }),
);
