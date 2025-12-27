const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const migrationSql = fs.readFileSync(path.join(__dirname, 'database/migrations/003_comprehensive_pod.sql')).toString();

async function runMigration() {
    try {
        console.log('Aplicando migración 003 (Comprehensive POD)...');
        await db.query(migrationSql);
        console.log('Migración 003 aplicada con éxito.');
    } catch (err) {
        console.error('Error aplicando migración:', err);
    } finally {
        await db.pool.end();
    }
}

runMigration();
