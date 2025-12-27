const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'database/migrations/004_fix_columns.sql'), 'utf8');
        await db.query(sql);
        console.log('Migration 004 applied successfully');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

applyMigration();
