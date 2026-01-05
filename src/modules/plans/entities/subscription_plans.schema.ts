import { pgTable, serial, text, doublePrecision, json, uuid, boolean } from 'drizzle-orm/pg-core';

export const subscriptionPlans = pgTable('user_subscription_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  price_monthly: doublePrecision('price_monthly'),
  price_yearly: doublePrecision('price_yearly'),
  features: json('features'),
  display_features: json('display_features'),
  is_active: boolean('is_active').default(true),
});
