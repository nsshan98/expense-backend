import { pgTable, text, json, uuid, boolean, varchar, timestamp } from 'drizzle-orm/pg-core';

export const subscriptionPlans = pgTable('user_subscription_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  plan_key: varchar('plan_key', { length: 50 }).unique(),
  paddle_product_id: varchar('paddle_product_id', { length: 255 }),
  is_paddle_enabled: boolean('is_paddle_enabled').default(false),
  features: json('features'),
  display_features: json('display_features'),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});
