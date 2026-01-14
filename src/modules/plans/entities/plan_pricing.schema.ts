import { pgTable, serial, varchar, numeric, text, boolean, timestamp, uuid, integer, jsonb } from 'drizzle-orm/pg-core';
import { subscriptionPlans } from './subscription_plans.schema';

export const planPricing = pgTable('plan_pricing', {
    id: uuid('id').primaryKey().defaultRandom(),
    plan_id: uuid('plan_id').references(() => subscriptionPlans.id).notNull(),
    provider: varchar('provider', { length: 20 }).notNull(), // 'manual' or 'paddle'
    interval: varchar('interval', { length: 20 }), // 'monthly', 'yearly', 'one-time'
    currency: varchar('currency', { length: 3 }).notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }), // For manual prices
    paddle_price_id: varchar('paddle_price_id', { length: 255 }), // For Paddle prices
    name: text('name'),
    min_quantity: integer('min_quantity').default(1),
    max_quantity: integer('max_quantity'),
    unit_price_overrides: jsonb('unit_price_overrides'), // Stored as JSON
    description: text('description'),
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at').defaultNow(),
});
