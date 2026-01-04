
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

    // Helper to search
    const searchContact = async (query) => {
        try {
            const res = await axios.get(`${baseURL}/api/v1/accounts/1/contacts/search`, {
                params: { q: query },
                headers: { 'api_access_token': token }
            });
            if (res.data.payload.length > 0) return res.data.payload[0].id;
        } catch (e) {
            // ignore search errors
        }
        return null;
    };

    try {
        // 1. Try Search by Email
        if (customer.email) {
            const id = await searchContact(customer.email);
            if (id) {
                console.log(`[CHATWOOT] Found contact by email: ${customer.email} -> ${id}`);
                return id;
            }
        }

        // 2. Try Search by Phone
        if (customer.phone) {
            const id = await searchContact(customer.phone);
            if (id) {
                console.log(`[CHATWOOT] Found contact by phone: ${customer.phone} -> ${id}`);
                return id;
            }
        }

        // 3. Create
        console.log('[CHATWOOT] Creating new contact...');
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
        // Detailed Error Logging
        if (e.response) {
            console.error('[CHATWOOT] Contact API Error:', e.response.status, JSON.stringify(e.response.data));

            // If error is 422 (Unprocessable Entity), it might be a duplicate that wasn't found by search?
            // Rare edge case, but possible.
        } else {
            console.error('[CHATWOOT] Contact Network Error:', e.message);
        }
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
