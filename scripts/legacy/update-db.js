const db = require('./config/db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function updateDb() {
    try {
        console.log('🔄 Actualizando esquema de base de datos...');

        // 1. Run SQL
        const sql = fs.readFileSync(path.join(__dirname, 'database/update_schema_v2.sql')).toString();
        await db.query(sql);
        console.log('✅ Columnas email y password_hash agregadas.');

        // 2. Seed Default Admin for Test Tenant
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const email = 'admin@demo.com';

        // Update the existing test tenant or insert if not exists
        // Asumimos que el tenant 'test-api-key' existe del paso anterior.
        const res = await db.query(`
        UPDATE tenants 
        SET email = $1, password_hash = $2 
        WHERE api_key = 'test-api-key'
        RETURNING id, name
    `, [email, hashedPassword]);

        if (res.rowCount > 0) {
            console.log(`👤 Tenant actualizado con credenciales dashboard:`);
            console.log(`   Email: ${email}`);
            console.log(`   Pass:  admin123`);
        } else {
            console.log('⚠️ No se encontró el tenant de prueba para actualizar.');
        }

    } catch (err) {
        console.error('❌ Error actualizando DB:', err);
    } finally {
        await db.pool.end();
    }
}

updateDb();
