import { pgTable, serial, text, numeric, json, uuid } from 'drizzle-orm/pg-core';

export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  price_monthly: numeric('price_monthly'),
  price_yearly: numeric('price_yearly'),
  features: json('features'),
});
