const fs = require('fs');
const path = require('path');
const db = require('./config/db');

const migrationSql = fs.readFileSync(path.join(__dirname, 'database/migrations/002_driver_auth_and_assignments.sql')).toString();

async function runMigration() {
    try {
        console.log('Aplicando migración 002 (Driver Auth & Assignments)...');
        await db.query(migrationSql);
        console.log('Migración 002 aplicada con éxito.');
    } catch (err) {
        console.error('Error aplicando migración:', err);
    } finally {
        await db.pool.end();
    }
}

runMigration();
