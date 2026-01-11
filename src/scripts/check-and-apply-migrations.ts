import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function main() {
    console.log('🔍 Checking migration status...\n');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        // Create migrations table if it doesn't exist
        await pool.query(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at BIGINT
      );
    `);

        // Check which migrations have been applied - GET ALL OF THEM
        const result = await pool.query(
            'SELECT * FROM __drizzle_migrations ORDER BY hash'
        );

        console.log(`📋 Applied migrations (${result.rows.length} total)`);

        console.log('\n📁 Available migration files:');
        const migrationsDir = path.join(process.cwd(), 'src', 'db', 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        files.forEach((file, index) => {
            const migrationName = file.replace('.sql', '');
            const isApplied = result.rows.some(row => row.hash === migrationName);
            console.log(`${index + 1}. ${file} ${isApplied ? '✅ APPLIED' : '⏳ PENDING'}`);
        });

        // Check if we need to apply migrations
        const pending = files.filter(file => {
            const migrationName = file.replace('.sql', '');
            return !result.rows.some(row => row.hash === migrationName);
        });

        if (pending.length > 0) {
            console.log(`\n⚠️  Found ${pending.length} pending migration(s):`);
            pending.forEach(file => console.log(`   - ${file}`));

            console.log('\n🚀 Applying pending migrations...');
            for (const file of pending) {
                const migrationName = file.replace('.sql', '');
                const sqlPath = path.join(migrationsDir, file);
                const sql = fs.readFileSync(sqlPath, 'utf-8');

                console.log(`\n📝 Applying ${migrationName}...`);
                try {
                    await pool.query(sql);
                    await pool.query(
                        'INSERT INTO __drizzle_migrations (hash, created_at) VALUES ($1, $2)',
                        [migrationName, Date.now()]
                    );
                    console.log(`✅ ${migrationName} applied successfully`);
                } catch (error: any) {
                    console.error(`❌ Failed to apply ${migrationName}:`, error.message);
                    throw error;
                }
            }
            console.log('\n🎉 All pending migrations applied successfully!');
        } else {
            console.log('\n✅ All migrations are up to date!');
        }

    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
