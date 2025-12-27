const db = require('../config/db');

async function getWebhooks(req, res) {
    const tenantId = req.tenant.id;
    try {
        const result = await db.query('SELECT * FROM webhooks WHERE tenant_id = $1 ORDER BY created_at DESC', [tenantId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching webhooks:', err);
        res.status(500).json({ error: 'Error al obtener webhooks' });
    }
}

async function createWebhook(req, res) {
    const tenantId = req.tenant.id;
    const { url, event_type } = req.body;

    if (!url || !event_type) {
        return res.status(400).json({ error: 'URL y Evento son requeridos' });
    }

    try {
        const result = await db.query(
            'INSERT INTO webhooks (tenant_id, url, event_type) VALUES ($1, $2, $3) RETURNING *',
            [tenantId, url, event_type]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error creating webhook:', err);
        res.status(500).json({ error: 'Error al crear webhook' });
    }
}

async function deleteWebhook(req, res) {
    const tenantId = req.tenant.id;
    const { id } = req.params;

    try {
        await db.query('DELETE FROM webhooks WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        res.json({ message: 'Webhook eliminado' });
    } catch (err) {
        console.error('Error deleting webhook:', err);
        res.status(500).json({ error: 'Error al eliminar webhook' });
    }
}

module.exports = { getWebhooks, createWebhook, deleteWebhook };
