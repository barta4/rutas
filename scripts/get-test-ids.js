const db = require('../src/config/db');

async function getIds() {
    try {
        const driverRes = await db.query("SELECT id, name FROM drivers WHERE username = 'chofer1'");
        const tenantRes = await db.query("SELECT id, api_key FROM tenants LIMIT 1");

        console.log(JSON.stringify({
            driver: driverRes.rows[0],
            tenant: tenantRes.rows[0]
        }));
    } catch (err) {
        console.error(err);
    } finally {
        await db.pool.end();
    }
}

getIds();
