
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('./config/db');
const fs = require('fs');

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, '../database/migrations/007_add_geocoding_fields.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration: 007_add_geocoding_fields.sql');
        await db.query(sql);
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
