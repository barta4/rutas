
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Client } = require('pg');

async function diagnose() {
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL missing in .env');
        process.exit(1);
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        console.log('\n🔍 --- DB SCHEMA DIAGNOSTIC ---');
        console.log('Connected to:', process.env.DATABASE_URL.split('@')[1]); // Hide password

        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tenants';
        `);

        const cols = res.rows.map(r => r.column_name);
        console.log('\n📋 Existing Columns in "tenants":');
        console.log(cols.join(', '));

        const required = ['max_drivers', 'max_orders', 'is_super_admin', 'status', 'trial_ends_at'];
        const missing = required.filter(c => !cols.includes(c));

        console.log('\n--------------------------------');
        if (missing.length > 0) {
            console.error('❌ CRITICAL ERROR: The following columns are MISSING:', missing);
            console.log('\n🛠  FIX: Run this SQL command immediately:');
            console.log(`
    sudo -u postgres psql -d rutas_db -c "ALTER TABLE tenants 
    ADD COLUMN IF NOT EXISTS max_drivers INTEGER DEFAULT 5,
    ADD COLUMN IF NOT EXISTS max_orders INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '14 days';"
            `);
        } else {
            console.log('✅ ALL SYSTEMS GO: All required columns are present.');
        }
        console.log('--------------------------------\n');

    } catch (e) {
        console.error('Connection failed:', e.message);
    } finally {
        await client.end();
    }
}

diagnose();
