
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

        // E.164 Formatting Helper (Simple)
        let phone = customer.phone;
        if (phone) {
            // Remove non-digits
            phone = phone.replace(/\D/g, '');
            // Add +598 if not present (Assumption for local context, or generic +)
            // If it starts with 09, it's likely UY mobile 09X XXX XXX -> 5989X XXX XXX
            if (phone.startsWith('09')) {
                phone = '598' + phone.substring(1);
            }
            if (!phone.startsWith('+')) {
                phone = '+' + phone;
            }
        }

        const createRes = await axios.post(`${baseURL}/api/v1/accounts/1/contacts`, {
            name: customer.name || 'Cliente',
            email: customer.email,
            phone_number: phone,
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

// 2. Get or Create Conversation
async function createConversation(baseURL, token, inboxId, contactId) {
    // 2.1 First, check if there is an existing ACTIVE conversation for this contact
    try {
        const conversationsRes = await axios.get(`${baseURL}/api/v1/accounts/1/contacts/${contactId}/conversations`, {
            headers: { 'api_access_token': token }
        });

        // Look for any conversation that is not 'resolved' (i.e., open or snoozed) and matches inbox
        // Note: Chatwoot API returns list of conversations.
        const existing = conversationsRes.data.payload.find(c => c.inbox_id == inboxId && c.status !== 'resolved');

        if (existing) {
            console.log(`[CHATWOOT] Found existing active conversation: ${existing.id}`);
            return existing.id;
        }
    } catch (e) {
        console.warn('[CHATWOOT] Failed to check existing conversations, proceeding to create:', e.message);
    }

    // 2.2 Create new if none found
    try {
        const res = await axios.post(`${baseURL}/api/v1/accounts/1/conversations`, {
            source_id: contactId,
            inbox_id: inboxId
        }, {
            headers: { 'api_access_token': token }
        });
        return res.data.id;
    } catch (e) {
        console.error('Chatwoot Conversation API Error:', e.response?.status, JSON.stringify(e.response?.data));

        // 404 Debugging
        if (e.response?.status === 404) {
            console.error('[CHATWOOT] 404 Error - Ensure Chatwoot Account ID is 1 and Inbox ID exists.');
        }
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
        console.error('Chatwoot Send Error:', e.message, e.response?.data);
    }
}

// Main Public Method
async function notifyStatusUpdate(tenantId, order, status) {
    let configRaw = await getConfig(tenantId);
    if (!configRaw) {
        console.log(`[CHATWOOT] No config found for tenant ${tenantId}`);
        return;
    }

    // Parse Config
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

    // Desctructure with default Account ID = 1
    const { url, api_token, inbox_id, account_id } = config;
    const accountId = account_id || 1; // Default to 1 if not provided

    if (!url || !api_token || !inbox_id) {
        console.log(`[CHATWOOT] Incomplete config for tenant ${tenantId}:`, { url_exists: !!url, token_exists: !!api_token, inbox: inbox_id });
        return;
    }

    console.log(`[CHATWOOT] Starting notification for Order #${order.id} Status: ${status} (Account: ${accountId})`);

    // Helper to Construct Base Account URL
    const getAccountBaseURL = () => `${url.replace(/\/$/, '')}/api/v1/accounts/${accountId}`;

    // ---------------------------------------------------------
    // INTERNAL HELPER FUNCTIONS (Scoped with config/accountId)
    // ---------------------------------------------------------

    // Search Contact
    const findContact = async (query) => {
        try {
            const res = await axios.get(`${getAccountBaseURL()}/contacts/search`, {
                params: { q: query },
                headers: { 'api_access_token': api_token }
            });
            return res.data.payload.length > 0 ? res.data.payload[0].id : null;
        } catch (e) { return null; }
    };

    // Create Contact
    const createContact = async (data) => {
        try {
            const res = await axios.post(`${getAccountBaseURL()}/contacts`, {
                ...data,
                inbox_id: Number(inbox_id)
            }, { headers: { 'api_access_token': api_token } });
            return res.data.payload.contact.id;
        } catch (e) {
            console.error('[CHATWOOT] Create Contact Error:', e.message, e.response?.data);
            return null;
        }
    };

    // Find Existing Conversation
    const findActiveConversation = async (contactId) => {
        try {
            const res = await axios.get(`${getAccountBaseURL()}/contacts/${contactId}/conversations`, {
                headers: { 'api_access_token': api_token }
            });
            // Find open/snoozed in same inbox
            const existing = res.data.payload.find(c => Number(c.inbox_id) === Number(inbox_id) && c.status !== 'resolved');
            return existing ? existing.id : null;
        } catch (e) { return null; }
    };

    // Create Conversation
    const createNewConversation = async (contactId) => {
        const url = `${getAccountBaseURL()}/conversations`;
        const payload = {
            source_id: Number(contactId),
            inbox_id: Number(inbox_id),
            status: 'open'
        };

        console.log(`[CHATWOOT] Creating Conversation... POST ${url}`, JSON.stringify(payload));

        try {
            const res = await axios.post(url, payload, { headers: { 'api_access_token': api_token } });
            return res.data.id;
        } catch (e) {
            console.error('[CHATWOOT] Create Conversation Error:', e.message, e.response?.data);

            // Debug 404
            if (e.response?.status === 404) {
                console.log('[CHATWOOT] 404 Checklist: ');
                console.log(`- Account ID: ${accountId}`);
                console.log(`- Inbox ID: ${inbox_id} (Type: ${typeof inbox_id})`);
                console.log(`- Contact ID: ${contactId}`);
            }
            return null;
        }
    };

    // Send Message
    const sendMsg = async (convId, text) => {
        try {
            await axios.post(`${getAccountBaseURL()}/conversations/${convId}/messages`, {
                content: text,
                message_type: 'outgoing',
                private: false
            }, { headers: { 'api_access_token': api_token } });
            console.log(`[CHATWOOT] Message sent to ${convId}`);
        } catch (e) {
            console.error('[CHATWOOT] Send Message Error:', e.message, e.response?.data);
        }
    };

    // ---------------------------------------------------------
    // MAIN FLOW
    // ---------------------------------------------------------

    // Fallback if no phone/email
    if (!order.customer_phone && !order.customer_email) {
        console.log('[CHATWOOT] Skipping: No phone/email for order', order.id);
        return;
    }

    // 1. Resolve Contact
    let contactId = null;
    if (order.customer_email) contactId = await findContact(order.customer_email);
    if (!contactId && order.customer_phone) contactId = await findContact(order.customer_phone);

    if (!contactId) {
        console.log('[CHATWOOT] Contact not found, creating new...');

        // E.164 Formatting (Duplicated here for safety)
        let phone = order.customer_phone;
        if (phone) {
            phone = phone.replace(/\D/g, '');
            if (phone.startsWith('09')) phone = '598' + phone.substring(1);
            if (!phone.startsWith('+')) phone = '+' + phone;
        }

        const contactData = {
            name: order.customer_name || 'Cliente',
            email: order.customer_email,
            phone_number: phone
        };
        contactId = await createContact(contactData);
    }

    if (!contactId) {
        console.log('[CHATWOOT] Failed to resolve contact ID');
        return;
    }
    console.log('[CHATWOOT] Contact ID Resolved:', contactId);

    // 2. Resolve Conversation
    let conversationId = await findActiveConversation(contactId);
    if (!conversationId) {
        console.log('[CHATWOOT] No active conversation, creating new...');
        conversationId = await createNewConversation(contactId);
    }

    if (!conversationId) {
        console.log('[CHATWOOT] Failed to resolve conversation ID');
        return;
    }
    console.log('[CHATWOOT] Conversation ID Resolved:', conversationId);

    // 3. Send Message
    let message = '';
    if (status === 'in_progress') {
        message = `🚚 Hola ${order.customer_name}, tu pedido #${order.id} está en camino. Prepárate para recibirlo pronto.`;
    } else if (status === 'approaching') {
        message = `📍 Hola ${order.customer_name}, el conductor está a menos de 500m de tu domicilio. ¡Saldrá en breve!`;
    } else if (status === 'delivered') {
        message = `✅ Entregado. Tu pedido #${order.id} ha llegado correctamente. ¡Gracias por confiar en nosotros!`;
    } else if (status === 'failed') {
        message = `⚠️ Hola ${order.customer_name}, intentamos entregar tu pedido #${order.id} pero no pudimos. Nos pondremos en contacto contigo.`;
    }

    if (message) {
        await sendMsg(conversationId, message);
    } else {
        console.log('[CHATWOOT] No message defined for status:', status);
    }
}

module.exports = { notifyStatusUpdate };
