import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const pendingRegistrations = pgTable('pending_registrations', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password_hash: text('password_hash').notNull(),
    otp_hash: text('otp_hash').notNull(),
    otp_expires_at: timestamp('otp_expires_at').notNull(),
    timezone: text('timezone').default('UTC'),
    created_at: timestamp('created_at').defaultNow(),
});
