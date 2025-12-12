import { pgTable, serial, text, numeric, json } from 'drizzle-orm/pg-core';

export const subscriptionPlans = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  name: text('name'),
  price_monthly: numeric('price_monthly'),
  price_yearly: numeric('price_yearly'),
  features: json('features'),
});
