const db = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function createDriver() {
    const username = 'chofer1';
    const password = 'password123';
    const name = 'Juan Perez';

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    try {
        // Get Tenant ID
        const tenantRes = await db.query('SELECT id FROM tenants LIMIT 1');
        const tenantId = tenantRes.rows[0].id;

        // Insert Driver
        const res = await db.query(`
            INSERT INTO drivers (tenant_id, name, username, password_hash, active)
            VALUES ($1, $2, $3, $4, true)
            RETURNING id, name, username
        `, [tenantId, name, username, hash]);

        console.log('Driver created:', res.rows[0]);
    } catch (err) {
        console.error('Error creating driver:', err);
    } finally {
        await db.pool.end();
    }
}

createDriver();
