const db = require('../src/config/db');

async function checkData() {
    try {
        console.log('--- CHECKING TENANTS ---');
        const tenants = await db.query('SELECT id, name, api_key FROM tenants');
        console.table(tenants.rows);

        console.log('\n--- CHECKING DEPOTS ---');
        const depots = await db.query('SELECT id, name, tenant_id FROM depots');
        console.table(depots.rows);

        console.log('\n--- CHECKING ORDERS ---');
        const orders = await db.query('SELECT id, customer_name, driver_id, tenant_id FROM orders LIMIT 5');
        console.table(orders.rows);

    } catch (err) {
        console.error('DB Check Error:', err);
    } finally {
        await db.pool.end();
    }
}

checkData();
