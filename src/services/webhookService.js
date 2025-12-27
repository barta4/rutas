const axios = require('axios');
require('dotenv').config();

// En un entorno real, esto vendría de la configuración del Tenant (DB)
// o una variable de entorno default.
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/logistica';

/**
 * Envía notificaciones a n8n.
 * @param {string} event - Nombre del evento (e.g. 'driver_approaching')
 * @param {object} payload - Datos relevantes
 */
async function notifyN8n(event, payload) {
    try {
        // Simulamos envío asíncrono para no bloquear el request principal
        console.log(`📡 Enviando webhook [${event}] a n8n...`);

        // axios.post(N8N_WEBHOOK_URL, { event, ...payload }).catch(err => ...);
        // Para dev, solo logueamos o hacemos el request si hay URL real
        if (process.env.N8N_WEBHOOK_URL) {
            await axios.post(process.env.N8N_WEBHOOK_URL, {
                event_type: event,
                timestamp: new Date().toISOString(),
                data: payload
            });
            console.log(`✅ Webhook enviado exitosamente.`);
        } else {
            console.log(`ℹ️ N8N_WEBHOOK_URL no config. Webhook simulado en consola.`);
        }

    } catch (err) {
        console.error(`❌ Error enviando webhook a n8n: ${err.message}`);
    }
}

module.exports = { notifyN8n };
