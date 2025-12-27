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
        const res = await db.query("SELECT * FROM tenants WHERE api_key = 'test-api-key'");
        if (res.rowCount === 0) {
            await db.query(`
            INSERT INTO tenants (name, api_key, config) 
            VALUES ('Empresa Demo', 'test-api-key', '{"ai_enabled": true}')
        `);
            console.log('Tenant de prueba creado. API Key: test-api-key');
        }

    } catch (err) {
        console.error('Error inicializando DB:', err);
    } finally {
        await db.pool.end();
    }
}

initDb();
