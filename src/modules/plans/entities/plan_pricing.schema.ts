import { pgTable, serial, integer, varchar, numeric, text } from 'drizzle-orm/pg-core';
import { subscriptionPlans } from './subscription_plans.schema';

export const planPricing = pgTable('plan_pricing', {
    id: serial('id').primaryKey(),
    plan_id: integer('plan_id').references(() => subscriptionPlans.id).notNull(),
    provider: varchar('provider', { length: 20 }).notNull(), // 'manual' or 'paddle'
    interval: varchar('interval', { length: 20 }), // 'monthly', 'yearly', 'one-time'
    currency: varchar('currency', { length: 3 }).notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }), // For manual prices
    paddle_price_id: varchar('paddle_price_id', { length: 255 }), // For Paddle prices
    description: text('description'),
});
