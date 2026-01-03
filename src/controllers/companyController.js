const db = require('../config/db');

const bcrypt = require('bcryptjs');

async function getCompanySettings(req, res) {
    const tenantId = req.tenant.id;
    try {
        const result = await db.query('SELECT name, email, config FROM tenants WHERE id = $1', [tenantId]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Tenant not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching company settings:', err);
        res.status(500).json({ error: 'Error fetching settings' });
    }
}

async function updateCompanySettings(req, res) {
    const tenantId = req.tenant.id;
    const { name, email, password, config } = req.body;

    try {
        let fields = [];
        let params = [];
        let idx = 1;

        if (name) {
            fields.push(`name = $${idx++}`);
            params.push(name);
        }
        if (email) {
            fields.push(`email = $${idx++}`);
            params.push(email);
        }
        if (password && password.trim().length > 0) {
            const hashedPassword = await bcrypt.hash(password, 10);
            fields.push(`password_hash = $${idx++}`);
            params.push(hashedPassword);
        }
        if (config) {
            fields.push(`config = $${idx++}`);
            params.push(config);
        }

        if (fields.length === 0) return res.json({ message: 'Nothing to update' });

        params.push(tenantId);
        const query = `UPDATE tenants SET ${fields.join(', ')} WHERE id = $${idx} RETURNING name, email, config`;

        const result = await db.query(query, params);
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'El email ya está en uso por otra cuenta.' });
        }
        console.error('Error updating company settings:', err);
        res.status(500).json({ error: 'Error updating settings' });
    }
}

module.exports = { getCompanySettings, updateCompanySettings };
