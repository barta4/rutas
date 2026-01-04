
require('dotenv').config();
const { Client } = require('pg');

async function checkIntegrations() {
    console.log('--- Checking Tenant Integrations (Stand-alone Script) ---');

    if (!process.env.DATABASE_URL) {
        console.error('ERROR: DATABASE_URL not found in .env');
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        // 1. Get tenants
        const tenants = await client.query('SELECT id, name, email FROM tenants');
        if (tenants.rows.length === 0) {
            console.log('No tenants found.');
            return;
        }

        for (const tenant of tenants.rows) {
            console.log(`\n------------------------------------------------`);
            console.log(`Tenant: ${tenant.name} (ID: ${tenant.id})`);
            console.log(`------------------------------------------------`);

            // 2. Get integrations for this tenant
            const res = await client.query(`
                SELECT type, config, is_active, updated_at 
                FROM tenant_integrations 
                WHERE tenant_id = $1
            `, [tenant.id]);

            if (res.rows.length === 0) {
                console.log('  No integrations configured.');
            } else {
                res.rows.forEach(row => {
                    console.log(`  [${row.type}] Active: ${row.is_active}`);
                    console.log(`  Upd: ${row.updated_at}`);
                    console.log(`  Config:`, JSON.stringify(row.config, null, 2));
                    console.log('');
                });
            }
        }

    } catch (e) {
        console.error('Database Error:', e);
    } finally {
        await client.end();
        process.exit();
    }
}

checkIntegrations();
