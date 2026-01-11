import { pgTable, serial, varchar, numeric, integer, timestamp, boolean, text } from 'drizzle-orm/pg-core';

export const coupons = pgTable('coupons', {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 50 }).unique().notNull(),
    provider: varchar('provider', { length: 20 }).notNull(), // 'manual' or 'paddle'
    discount_type: varchar('discount_type', { length: 20 }).notNull(), // 'flat', 'flat_per_seat', 'percentage'
    discount_amount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }), // Required for flat discounts
    paddle_discount_id: varchar('paddle_discount_id', { length: 255 }),
    max_uses: integer('max_uses'),
    times_used: integer('times_used').default(0).notNull(),
    expires_at: timestamp('expires_at'),
    is_active: boolean('is_active').default(true).notNull(),
    description: text('description'),
    created_at: timestamp('created_at').defaultNow(),
});
