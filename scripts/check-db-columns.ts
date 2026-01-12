
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load env vars
dotenv.config();

// Handle AWS secrets if needed (copied from common pattern if present, but simpler to just try simple env var first)
// Checking if DATABASE_URL is present
async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('DATABASE_URL is not defined in environment variables');
        process.exit(1);
    }

    const client = new Client({
        connectionString: connectionString,
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_subscriptions';
    `);

        console.log('Columns in user_subscriptions table:');
        const columns = res.rows.map(row => row.column_name);
        console.table(res.rows);

        const hasNextRenewalDate = columns.includes('next_renewal_date');
        if (hasNextRenewalDate) {
            console.log('SUCCESS: next_renewal_date column exists.');
        } else {
            console.error('FAILURE: next_renewal_date column MISSING.');
        }

        // Also check table existence just in case
        const tableRes = await client.query(`
      SELECT to_regclass('public.user_subscriptions');
    `);
        console.log('Table check:', tableRes.rows[0]);

    } catch (err) {
        console.error('Database query error:', err);
    } finally {
        await client.end();
    }
}

main();
