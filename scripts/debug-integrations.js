
const db = require('../src/config/db');

async function checkIntegrations() {
    try {
        console.log('--- Checking Tenant Integrations ---');

        // 1. Get a tenant (assuming the one user is using is the first/main one, or we list all)
        const tenants = await db.query('SELECT id, name, email FROM tenants LIMIT 1');
        if (tenants.rows.length === 0) {
            console.log('No tenants found.');
            return;
        }

        const tenant = tenants.rows[0];
        console.log(`Checking integrations for Tenant: ${tenant.name} (${tenant.id})`);

        // 2. Get integrations
        const res = await db.query(`
            SELECT type, config, is_active, updated_at 
            FROM tenant_integrations 
            WHERE tenant_id = $1
        `, [tenant.id]);

        if (res.rows.length === 0) {
            console.log('No integrations found for this tenant.');
        } else {
            res.rows.forEach(row => {
                console.log(`\n[${row.type}] Active: ${row.is_active}`);
                console.log('Config:', JSON.stringify(row.config, null, 2));
            });
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit();
    }
}

checkIntegrations();
