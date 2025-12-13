import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  json,
  numeric,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '../../users/entities/users.schema';
import { subscriptionPlans } from '../../plans/entities/subscription_plans.schema';

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  plan_id: uuid('plan_id')
    .references(() => subscriptionPlans.id)
    .notNull(),
  status: text('status').notNull(), // active, trialing, canceled, past_due
  renewal_date: timestamp('renewal_date'),
  created_at: timestamp('created_at').defaultNow(),
});

export const paymentEvents = pgTable('payment_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  subscription_id: uuid('subscription_id').references(
    () => subscriptions.id,
  ),
  amount: numeric('amount').notNull(),
  payment_method: text('payment_method').default('local'),
  status: text('status').notNull(), // paid, failed
  reference: text('reference'),
  payload: json('payload'),
  created_at: timestamp('created_at').defaultNow(),
});
