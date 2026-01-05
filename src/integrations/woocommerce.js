
const axios = require('axios');
const db = require('../config/db');

async function sync(integration) {
    const { url, consumer_key, consumer_secret } = integration.config;

    // Basic validation
    if (!url || !consumer_key || !consumer_secret) return;

    try {
        console.log(`[WooCommerce] Syncing for Tenant ${integration.tenant_id}...`);

        // Ensure valid URL
        const cleanUrl = url.replace(/\/$/, '');
        const apiUrl = `${cleanUrl}/wp-json/wc/v3/orders`;

        // WooCommerce Auth (Basic Auth)
        const auth = {
            username: consumer_key,
            password: consumer_secret
        };

        // Fetch Orders (status: processing)
        const response = await axios.get(apiUrl, {
            auth: auth,
            params: {
                status: 'processing',
                per_page: 20,
                orderby: 'date',
                order: 'desc'
            }
        });

        const orders = response.data;
        if (!orders || !Array.isArray(orders)) return;

        let count = 0;
        for (const wooOrder of orders) {
            // DUPLICATE CHECK
            // We look for the unique tag [Woo: ID] in completion_notes
            const exists = await db.query(
                `SELECT 1 FROM orders WHERE tenant_id = $1 AND completion_notes LIKE $2`,
                [integration.tenant_id, `%[Woo: ${wooOrder.id}]%`]
            );

            if (exists.rowCount === 0) {
                // Prepare Data
                const shipping = wooOrder.shipping || {};
                const billing = wooOrder.billing || {};

                // Customer Name: Try shipping first, then billing
                const firstName = shipping.first_name || billing.first_name || 'Cliente';
                const lastName = shipping.last_name || billing.last_name || 'WooCommerce';
                const customerName = `${firstName} ${lastName}`.trim();

                // Address: Combine lines
                const address1 = shipping.address_1 || billing.address_1 || '';
                const city = shipping.city || billing.city || '';
                const state = shipping.state || billing.state || '';
                const addressText = `${address1}, ${city}, ${state}`.trim() || 'Dirección pendiente';

                // Items list for notes
                const itemsList = wooOrder.line_items.map(item =>
                    `${item.quantity}x ${item.name}`
                ).join(', ');

                // Insert
                await db.query(`
                    INSERT INTO orders (
                        tenant_id, customer_name, address_text, city, status, completion_notes, created_at
                    ) VALUES ($1, $2, $3, $4, 'pending', $5, NOW())
                `, [
                    integration.tenant_id,
                    customerName,
                    addressText,
                    city,
                    `[Woo: ${wooOrder.id}] Total: ${wooOrder.currency} ${wooOrder.total} - Items: ${itemsList}`
                ]);
                count++;
            }
        }

        if (count > 0) console.log(`[WooCommerce] Imported ${count} new orders.`);

    } catch (err) {
        console.error(`[WooCommerce] Sync Error: ${err.message}`);
        if (err.response) {
            console.error('Woo Response Data:', err.response.data);
        }
    }
}

module.exports = { sync };
