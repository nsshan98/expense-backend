import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('🔧 Marking existing migrations as applied...\n');

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

        // Mark migrations 0000 through 0020 as applied
        const existingMigrations = [
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
            '0011_broken_warpath',
            '0012_unusual_supernaut',
            '0013_reflective_black_widow',
            '0014_outstanding_nitro',
            '0015_clever_naoko',
            '0016_normal_falcon',
            '0017_lazy_yellowjacket',
            '0018_brainy_psynapse',
            '0019_overconfident_sabra',
            '0020_needy_psynapse',
        ];

        console.log(`📝 Marking ${existingMigrations.length} migrations as applied...`);

        for (const migration of existingMigrations) {
            await pool.query(
                'INSERT INTO __drizzle_migrations (hash, created_at) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [migration, Date.now()]
            );
            console.log(`✅ ${migration}`);
        }

        console.log('\n🎉 All existing migrations marked as applied!');
        console.log('\n📌 Now run: npx tsx src/scripts/check-and-apply-migrations.ts');
        console.log('   This will apply only migrations 0021 and 0022');

    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
