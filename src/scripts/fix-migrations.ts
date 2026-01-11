import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        // First, let's see what's in the table
        const result = await pool.query('SELECT hash FROM __drizzle_migrations ORDER BY hash');
        console.log('Current migrations in database:');
        result.rows.forEach(row => console.log(`  - ${row.hash}`));

        console.log('\n📝 Inserting missing migrations 0000-0010...');

        const missing = [
            '0000_freezing_microchip',
            '0001_smiling_toad_men',
            '0002_hesitant_slapstick',
            '0003_kind_james_howlett',
            '0004_good_strong_guy',
            '0005_steady_wild_pack',
            '0006_loud_terror',
            '0007_heavy_crystal',
            '0008_yummy_domino',
            '0009_bizarre_chronomancer',
            '0010_unique_surge',
        ];

        for (const migration of missing) {
            const exists = result.rows.some(row => row.hash === migration);
            if (!exists) {
                await pool.query(
                    'INSERT INTO __drizzle_migrations (hash, created_at) VALUES ($1, $2)',
                    [migration, Date.now()]
                );
                console.log(`✅ Added ${migration}`);
            } else {
                console.log(`⏭️  Skipped ${migration} (already exists)`);
            }
        }

        console.log('\n✅ Done!');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
