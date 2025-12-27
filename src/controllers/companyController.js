const db = require('../config/db');

async function getCompanySettings(req, res) {
    const tenantId = req.tenant.id;
    try {
        const result = await db.query('SELECT name, config FROM tenants WHERE id = $1', [tenantId]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Tenant not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching company settings:', err);
        res.status(500).json({ error: 'Error fetching settings' });
    }
}

async function updateCompanySettings(req, res) {
    const tenantId = req.tenant.id;
    const { name, config } = req.body;

    try {
        // Merge config if exists, or replace? Assuming merge or replace. Let's do partial update for config if possible or full replace.
        // For simplicity, we'll update name and overwrite config if provided, or merge using JSONB concatenation?
        // Let's assume the client sends the full config object they want to save.

        let query = 'UPDATE tenants SET name = COALESCE($1, name)';
        let params = [name];
        let idx = 2;

        if (config) {
            query += `, config = $${idx}`;
            params.push(config);
            idx++;
        }

        query += ` WHERE id = $${idx} RETURNING name, config`;
        params.push(tenantId);

        const result = await db.query(query, params);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating company settings:', err);
        res.status(500).json({ error: 'Error updating settings' });
    }
}

module.exports = { getCompanySettings, updateCompanySettings };
