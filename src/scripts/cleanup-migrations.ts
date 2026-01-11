import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('🧹 Cleaning up duplicate migrations...\n');

        // Delete all and re-insert unique ones
        await pool.query('DELETE FROM __drizzle_migrations');

        const allMigrations = [
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

        for (const migration of allMigrations) {
            await pool.query(
                'INSERT INTO __drizzle_migrations (hash, created_at) VALUES ($1, $2)',
                [migration, Date.now()]
            );
            console.log(`✅ ${migration}`);
        }

        console.log('\n✅ Migration table cleaned and repopulated!');
        console.log('\n📌 Now run: npx tsx src/scripts/check-and-apply-migrations.ts');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
