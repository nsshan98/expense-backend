import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function resetDb() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const tables = [
            'payment_events',
            'subscriptions',
            'predictions_cache',
            'transactions',
            'budgets',
            'predictions',
            'merge_map',
            'categories',
            'users',
            'subscription_plans',
        ];

        for (const table of tables) {
            console.log(`Dropping table ${table}...`);
            await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        }

        console.log('All tables dropped successfully.');
    } catch (error) {
        console.error('Error resetting database:', error);
    } finally {
        await client.end();
    }
}

resetDb();
