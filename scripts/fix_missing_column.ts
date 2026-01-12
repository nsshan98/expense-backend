
import { Client } from 'pg';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config();

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('DATABASE_URL is not defined');
        process.exit(1);
    }

    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('Connected to database. Attempting to add missing column...');

        await client.query(`
      ALTER TABLE "user_subscriptions" 
      ADD COLUMN IF NOT EXISTS "next_renewal_date" timestamp;
    `);

        console.log('Successfully executed ALTER TABLE command.');

        // Verify
        const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_subscriptions' 
      AND column_name = 'next_renewal_date';
    `);

        if (res.rows.length > 0) {
            console.log('VERIFIED: next_renewal_date column exists.');
        } else {
            console.error('VERIFICATION FAILED: Column still missing.');
        }

    } catch (err) {
        console.error('Error executing SQL:', err);
    } finally {
        await client.end();
    }
}

main();
