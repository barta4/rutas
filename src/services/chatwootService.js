
const axios = require('axios');
const db = require('../config/db');

// Helper to get integration config
async function getConfig(tenantId) {
    const res = await db.query(
        `SELECT config FROM tenant_integrations WHERE tenant_id = $1 AND type = 'chatwoot' AND is_active = true`,
        [tenantId]
    );
    if (res.rowCount === 0) return null;
    return res.rows[0].config;
}

// 1. Find or Create Contact
async function findOrCreateContact(baseURL, token, inboxId, customer) {
    if (!customer.email && !customer.phone) return null;

    try {
        // Search
        const searchRes = await axios.get(`${baseURL}/api/v1/accounts/1/contacts/search`, {
            params: { q: customer.email || customer.phone },
            headers: { 'api_access_token': token }
        });

        if (searchRes.data.payload.length > 0) {
            return searchRes.data.payload[0].id;
        }

        // Create
        const createRes = await axios.post(`${baseURL}/api/v1/accounts/1/contacts`, {
            name: customer.name || 'Cliente',
            email: customer.email,
            phone_number: customer.phone,
            inbox_id: inboxId
        }, {
            headers: { 'api_access_token': token }
        });

        return createRes.data.payload.contact.id;
    } catch (e) {
        console.error('Chatwoot Contact Error:', e.message);
        return null;
    }
}

// 2. Create Conversation
async function createConversation(baseURL, token, inboxId, contactId) {
    try {
        const res = await axios.post(`${baseURL}/api/v1/accounts/1/conversations`, {
            source_id: contactId,
            inbox_id: inboxId
        }, {
            headers: { 'api_access_token': token }
        });
        return res.data.id;
    } catch (e) {
        // Conversation might already exist active, search relevant logic omitted for brevity
        // If fail, just return null, we can't message
        console.error('Chatwoot Converation Error:', e.message);
        return null;
    }
}

// 3. Send Message
async function sendMessage(baseURL, token, conversationId, message) {
    try {
        await axios.post(`${baseURL}/api/v1/accounts/1/conversations/${conversationId}/messages`, {
            content: message,
            message_type: 'outgoing',
            private: false
        }, {
            headers: { 'api_access_token': token }
        });
        console.log(`[Chatwoot] Message sent to conv ${conversationId}`);
    } catch (e) {
        console.error('Chatwoot Send Error:', e.message);
    }
}

// Main Public Method
async function notifyStatusUpdate(tenantId, order, status) {
    const config = await getConfig(tenantId);
    if (!config) return; // Not integrated

    const { url, api_token, inbox_id } = config;
    if (!url || !api_token || !inbox_id) return;

    // Contact info from order (assuming order has customer_name/phone/email columns or logic to get them)
    // Note: 'orders' table structure typically has 'customer_name' and 'address_text'. 
    // Phone usually comes from 'customer' table if normalized, or stored in order. 
    // IMPORTANT: Assuming 'customer_phone' exists in order object passed here, or query it.

    // Fallback if no phone/email
    if (!order.customer_phone && !order.customer_email) {
        console.log('[Chatwoot] Skipping: No phone/email for order', order.id);
        return;
    }

    const customer = {
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone
    };

    const contactId = await findOrCreateContact(url, api_token, inbox_id, customer);
    if (!contactId) return;

    const conversationId = await createConversation(url, api_token, inbox_id, contactId);
    if (!conversationId) return;

    let message = '';
    if (status === 'in_progress') {
        message = `🚚 Hola ${customer.name}, tu pedido #${order.id} está en camino. Prepárate para recibirlo pronto.`;
    } else if (status === 'delivered') {
        message = `✅ Entregado. Tu pedido #${order.id} ha llegado correctamente. ¡Gracias por confiar en nosotros!`;
    } else if (status === 'failed') {
        message = `⚠️ Hola ${customer.name}, intentamos entregar tu pedido #${order.id} pero no pudimos. Nos pondremos en contacto contigo.`;
    }

    if (message) {
        await sendMessage(url, api_token, conversationId, message);
    }
}

module.exports = { notifyStatusUpdate };
