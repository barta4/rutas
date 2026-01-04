
const db = require('../config/db');
const integrationsManager = require('../integrations'); // To trigger immediate sync if needed

async function saveIntegration(req, res) {
    const { type } = req.params;
    const { config, is_active } = req.body;
    const tenant_id = req.tenant.id;

    if (!['dolibarr', 'odoo', 'woocommerce', 'wix', 'chatwoot'].includes(type)) {
        return res.status(400).json({ error: 'Tipo de integración no soportado' });
    }

    try {
        await db.query(`
            INSERT INTO tenant_integrations (tenant_id, type, config, is_active, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (tenant_id, type) 
            DO UPDATE SET config = $3, is_active = $4, updated_at = NOW()
        `, [tenant_id, type, config, is_active]);

        console.log(`[INTEGRATION] Saved ${type} for tenant ${tenant_id}`, { is_active, configKeys: Object.keys(config) });

        res.json({ message: 'Integración guardada exitosamente' });

        // Optional: Trigger query test immediately in background
        // integrationsManager.runScheduler(); 

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error guardando integración' });
    }
}

async function getIntegration(req, res) {
    const { type } = req.params;
    const tenant_id = req.tenant.id;

    try {
        const result = await db.query(
            'SELECT config, is_active, last_sync_at FROM tenant_integrations WHERE tenant_id = $1 AND type = $2',
            [tenant_id, type]
        );

        if (result.rows.length === 0) return res.json({});
        res.json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo integración' });
    }
}

async function testChatwoot(req, res) {
    const tenant_id = req.tenant.id;
    const { phone } = req.body;

    if (!phone) return res.status(400).json({ error: 'Teléfono requerido' });

    console.log(`[TEST] Testing Chatwoot for tenant ${tenant_id} to ${phone}`);

    const chatwootService = require('../services/chatwootService');

    // Mock minimal order object
    const mockOrder = {
        id: 'TEST-001',
        customer_name: 'Test User',
        customer_phone: phone,
        customer_email: 'test@example.com'
    };

    try {
        await chatwootService.notifyStatusUpdate(tenant_id, mockOrder, 'in_progress');
        res.json({ message: 'Mensaje de prueba enviado (Revisa Logs/Chatwoot)' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error enviando prueba: ' + e.message });
    }
}

module.exports = { saveIntegration, getIntegration, testChatwoot };
