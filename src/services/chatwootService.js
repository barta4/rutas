
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
    let configRaw = await getConfig(tenantId);
    if (!configRaw) {
        console.log(`[CHATWOOT] No config found for tenant ${tenantId}`);
        return;
    }

    let config = configRaw;
    if (typeof config === 'string') {
        try {
            config = JSON.parse(config);
        } catch (e) {
            console.error('[CHATWOOT] Config is invalid JSON string:', configRaw);
            return;
        }
    }

    console.log(`[CHATWOOT] Loaded config for ${tenantId}:`, typeof config, JSON.stringify(config));

    const { url, api_token, inbox_id } = config;
    if (!url || !api_token || !inbox_id) {
        console.log(`[CHATWOOT] Incomplete config for tenant ${tenantId}:`, { url_exists: !!url, token_exists: !!api_token, inbox: inbox_id });
        return;
    }

    console.log(`[CHATWOOT] Starting notification for Order #${order.id} Status: ${status}`);

    // Fallback if no phone/email
    if (!order.customer_phone && !order.customer_email) {
        console.log('[CHATWOOT] Skipping: No phone/email for order', order.id);
        return;
    }

    const customer = {
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone
    };

    console.log('[CHATWOOT] Seeking Contact:', customer);
    const contactId = await findOrCreateContact(url, api_token, inbox_id, customer);
    if (!contactId) {
        console.log('[CHATWOOT] Failed to find/create contact');
        return;
    }
    console.log('[CHATWOOT] Contact ID:', contactId);

    const conversationId = await createConversation(url, api_token, inbox_id, contactId);
    if (!conversationId) {
        console.log('[CHATWOOT] Failed to create conversation');
        return;
    }
    console.log('[CHATWOOT] Conversation ID:', conversationId);

    let message = '';
    if (status === 'in_progress') {
        message = `🚚 Hola ${customer.name}, tu pedido #${order.id} está en camino. Prepárate para recibirlo pronto.`;
    } else if (status === 'delivered') {
        message = `✅ Entregado. Tu pedido #${order.id} ha llegado correctamente. ¡Gracias por confiar en nosotros!`;
    } else if (status === 'failed') {
        message = `⚠️ Hola ${customer.name}, intentamos entregar tu pedido #${order.id} pero no pudimos. Nos pondremos en contacto contigo.`;
    }

    if (message) {
        console.log('[CHATWOOT] Sending Message:', message);
        await sendMessage(url, api_token, conversationId, message);
    } else {
        console.log('[CHATWOOT] No message defined for status:', status);
    }
}

module.exports = { notifyStatusUpdate };
