const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const initSql = fs.readFileSync(path.join(__dirname, 'database/init.sql')).toString();

async function initDb() {
    try {
        console.log('Iniciando configuración de DB...');
        await db.query(initSql);
        console.log('Tablas y extensiones creadas exitosamente.');

        // Crear un tenant de prueba si no existe
        const res = await db.query("SELECT * FROM tenants WHERE email = 'admin@demo.com'");
        if (res.rowCount === 0) {
            // Hash de 'admin123'
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin123', 10);

            await db.query(`
            INSERT INTO tenants (name, api_key, email, password_hash, config) 
            VALUES ('Empresa Demo', 'test-api-key', 'admin@demo.com', $1, '{"ai_enabled": true}')
            `, [hashedPassword]);

            console.log('✅ Tenant Admin creado: admin@demo.com / admin123');
        } else {
            console.log('ℹ️ Admin ya existe.');
        }

    } catch (err) {
        console.error('Error inicializando DB:', err);
    } finally {
        await db.pool.end();
    }
}

initDb();
