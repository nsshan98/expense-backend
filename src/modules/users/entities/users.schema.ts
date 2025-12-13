import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  uuid,
} from 'drizzle-orm/pg-core';
import { subscriptionPlans } from '../../plans/entities/subscription_plans.schema';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').unique(),
  password_hash: text('password_hash'),
  role: text('role').default('user'),
  plan_id: uuid('plan_id').references(() => subscriptionPlans.id),
  created_at: timestamp('created_at').defaultNow(),
  hashed_refresh_token: text('hashed_refresh_token'),
});
