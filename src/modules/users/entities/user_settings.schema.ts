import { pgTable, text, timestamp, uuid, json } from 'drizzle-orm/pg-core';
import { users } from '../../users/entities/users.schema';

export const userSettings = pgTable('user_settings', {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
        .references(() => users.id)
        .notNull()
        .unique(),
    gemini_api_key: text('gemini_api_key'), // Encrypted
    weekend_days: json('weekend_days').$type<number[]>(),
    updated_at: timestamp('updated_at').defaultNow(),
});
