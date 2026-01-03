
const axios = require('axios');
const db = require('../config/db');

async function sync(integration) {
    const { url, api_key } = integration.config;
    // Ensure URL has no trailing slash and api_key exists
    if (!url || !api_key) return;

    try {
        console.log(`[Dolibarr] Syncing for Tenant ${integration.tenant_id}...`);

        // 1. Fetch Orders (Example: status = validated)
        // Dolibarr API: GET /api/index.php/orders?sortfield=t.rowid&sortorder=DESC&limit=100&sqlfilters=(t.fk_statut:=:1)
        // Note: Filters depend on specific Dolibarr version. Using basic fetch for now.
        const apiUrl = `${url.replace(/\/$/, '')}/api/index.php/orders?sortfield=t.rowid&sortorder=DESC&limit=20`;

        const response = await axios.get(apiUrl, {
            headers: { 'DOLAPIKEY': api_key }
        });

        const orders = response.data;
        if (!orders || !Array.isArray(orders)) return;

        let count = 0;
        for (const extOrder of orders) {
            // Check if exists
            const exists = await db.query(
                `SELECT 1 FROM orders WHERE tenant_id = $1 AND completion_notes LIKE $2`, // Using notes to store external ID temporarily or add a dedicated column later
                [integration.tenant_id, `%[Dolibarr: ${extOrder.ref}]%`]
            );

            if (exists.rowCount === 0) {
                // Insert new order
                await db.query(`
                    INSERT INTO orders (
                        tenant_id, customer_name, address_text, status, completion_notes, created_at
                    ) VALUES ($1, $2, $3, 'pending', $4, NOW())
                `, [
                    integration.tenant_id,
                    extOrder.socid ? `Customer ${extOrder.socid}` : 'Cliente Dolibarr', // Ideally fetch customer name
                    'Dirección pendiente de mapeo', // Dolibarr addresses are complex, need fetching contact
                    `[Dolibarr: ${extOrder.ref}] Total: ${extOrder.total_ttc}`
                ]);
                count++;
            }
        }

        if (count > 0) console.log(`[Dolibarr] Imported ${count} new orders.`);

    } catch (err) {
        console.error(`[Dolibarr] Sync Error: ${err.message}`);
    }
}

module.exports = { sync };
