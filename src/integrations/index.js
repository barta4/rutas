
const db = require('../config/db');
const dolibarr = require('./dolibarr');

const REGISTRY = {
    'dolibarr': dolibarr
    // 'odoo': require('./odoo')
};

async function runScheduler() {
    console.log('🔄 Running Integrations Sync...');

    try {
        // Fetch active integrations
        const result = await db.query(`
            SELECT * FROM tenant_integrations WHERE is_active = true
        `);

        for (const integration of result.rows) {
            const handler = REGISTRY[integration.type];
            if (handler) {
                await handler.sync(integration);
                // Update last sync
                await db.query('UPDATE tenant_integrations SET last_sync_at = NOW() WHERE id = $1', [integration.id]);
            }
        }
    } catch (err) {
        console.error('Integrations Scheduler Error:', err);
    }
}

// Start Scheduler Loop (e.g., every 5 minutes)
function start() {
    // Run immediately on boot
    runScheduler();

    // Interval: 5 minutes (300000 ms)
    setInterval(runScheduler, 300000);
}

module.exports = { start, runScheduler };
