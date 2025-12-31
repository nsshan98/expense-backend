import {
  pgTable,
  text,
  timestamp,
  json,
  doublePrecision,
  uuid,
  integer,
} from 'drizzle-orm/pg-core';
import { users } from '../../users/entities/users.schema';
import { subscriptionPlans } from '../../plans/entities/subscription_plans.schema';

export const subscriptions = pgTable('user_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  plan_id: uuid('plan_id')
    .references(() => subscriptionPlans.id)
    .notNull(),
  status: text('status').notNull(), // active, trialing, canceled, past_due, expired
  start_date: timestamp('start_date'),
  end_date: timestamp('end_date'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const subscriptionOrders = pgTable('plan_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  plan_id: uuid('plan_id')
    .references(() => subscriptionPlans.id)
    .notNull(),
  status: text('status').notNull().default('draft'), // draft, pending_verification, rejected, completed
  amount_snapshot: doublePrecision('amount_snapshot').notNull(),
  duration_snapshot: integer('duration_snapshot').notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const paymentSubmissions = pgTable('payment_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  order_id: uuid('order_id')
    .references(() => subscriptionOrders.id)
    .notNull(),
  user_id: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  provider: text('provider').notNull(),
  transaction_id: text('transaction_id').notNull(), // duplicate allowed technically, handled in logic
  sender_number: text('sender_number'),
  payment_date: timestamp('payment_date'),
  status: text('status').notNull().default('submitted'), // submitted, verified, rejected
  verification_notes: text('verification_notes'),
  verified_by: uuid('verified_by').references(() => users.id),
  verified_at: timestamp('verified_at'),
  created_at: timestamp('created_at').defaultNow(),
});

// Deprecated or for other flows? Keeping for now but not using for manual flow if not needed.
export const paymentEvents = pgTable('payment_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  subscription_id: uuid('subscription_id').references(
    () => subscriptions.id,
  ),
  amount: doublePrecision('amount').notNull(),
  payment_method: text('payment_method').default('local'),
  status: text('status').notNull(), // paid, failed
  reference: text('reference'),
  payload: json('payload'),
  created_at: timestamp('created_at').defaultNow(),
});
