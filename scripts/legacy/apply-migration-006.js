const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('./config/db');
const fs = require('fs');

async function applyMigration() {
    console.log('DB URL Loaded:', process.env.DATABASE_URL ? 'YES' : 'NO');
    if (process.env.DATABASE_URL) console.log('DB URL Start:', process.env.DATABASE_URL.substring(0, 15));
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'database/migrations/006_improvements.sql'), 'utf8');
        await db.query(sql);
        console.log('Migration 006 applied successfully');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

applyMigration();
