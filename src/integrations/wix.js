
const axios = require('axios');
const db = require('../config/db');

async function sync(integration) {
    const { site_id, api_key } = integration.config;

    // Basic validation
    if (!site_id || !api_key) return;

    try {
        console.log(`[Wix] Syncing for Tenant ${integration.tenant_id}...`);

        // Wix Stores API: Query Orders
        // Doc: https://dev.wix.com/api/rest/wix-stores/orders/query-orders
        const apiUrl = `https://www.wixapis.com/stores/v2/orders/query`;

        const response = await axios.post(apiUrl, {
            query: {
                filter: {
                    // Filter: Paid and Not fully fulfilled
                    "paymentStatus": "PAID",
                    "fulfillmentStatus": "NOT_FULFILLED"
                },
                sort: [{ "dateCreated": "desc" }],
                limit: 20
            }
        }, {
            headers: {
                'Authorization': api_key,
                'wix-site-id': site_id,
                'Content-Type': 'application/json'
            }
        });

        const orders = response.data.orders;
        if (!orders || !Array.isArray(orders)) return;

        let count = 0;
        for (const wixOrder of orders) {
            // DUPLICATE CHECK
            // We look for the unique tag [Wix: ID]
            const exists = await db.query(
                `SELECT 1 FROM orders WHERE tenant_id = $1 AND completion_notes LIKE $2`,
                [integration.tenant_id, `%[Wix: ${wixOrder.number}]%`]
            );

            if (exists.rowCount === 0) {
                // Prepare Data
                const shipping = wixOrder.shippingInfo || {};
                const checkShipment = shipping.shipmentDetails || {};
                const billing = wixOrder.billingInfo || {};

                // Customer Name
                const firstName = checkShipment.firstName || billing.firstName || 'Cliente';
                const lastName = checkShipment.lastName || billing.lastName || 'Wix';
                const customerName = `${firstName} ${lastName}`.trim();

                // Address
                const addrObj = checkShipment.address || billing.address || {};
                const addressLine = addrObj.addressLine1 || '';
                const city = addrObj.city || '';
                const addressText = `${addressLine}, ${city}`.trim() || 'Dirección pendiente';

                // Items list
                const itemsList = (wixOrder.lineItems || []).map(item =>
                    `${item.quantity}x ${item.name.translated || item.name.original}`
                ).join(', ');

                // Insert
                await db.query(`
                    INSERT INTO orders (
                        tenant_id, customer_name, address_text, status, completion_notes, created_at
                    ) VALUES ($1, $2, $3, 'pending', $4, NOW())
                `, [
                    integration.tenant_id,
                    customerName,
                    addressText,
                    `[Wix: ${wixOrder.number}] Total: ${wixOrder.currency} ${wixOrder.totals.total} - Items: ${itemsList}`
                ]);
                count++;
            }
        }

        if (count > 0) console.log(`[Wix] Imported ${count} new orders.`);

    } catch (err) {
        console.error(`[Wix] Sync Error: ${err.message}`);
        if (err.response) {
            console.error('Wix Response Data:', JSON.stringify(err.response.data));
        }
    }
}

module.exports = { sync };
