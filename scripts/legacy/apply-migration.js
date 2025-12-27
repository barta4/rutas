const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const migrationSql = fs.readFileSync(path.join(__dirname, 'database/migrations/001_create_webhooks.sql')).toString();

async function runMigration() {
    try {
        console.log('Aplicando migración de webhooks...');
        await db.query(migrationSql);
        console.log('Tabla webhooks creada exitosamente.');
    } catch (err) {
        console.error('Error aplicando migración:', err);
    } finally {
        await db.pool.end();
    }
}

runMigration();
