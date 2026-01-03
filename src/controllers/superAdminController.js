const db = require('../config/db');

// Ensure only super admin can access
const ensureSuperAdmin = (req, res, next) => {
    if (!req.tenant || !req.tenant.is_super_admin) {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere Super Admin.' });
    }
    next();
};

async function getAllTenants(req, res) {
    try {
        const result = await db.query(`
            SELECT id, name, email, trial_ends_at, is_super_admin, status, max_drivers, max_orders, created_at 
            FROM tenants 
            ORDER BY created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching tenants' });
    }
}

async function updateTenant(req, res) {
    const { id } = req.params;
    const { max_drivers, status, extend_trial_days } = req.body;

    try {
        let query = 'UPDATE tenants SET updated_at = NOW()';
        const params = [];
        let idx = 1;

        if (max_drivers !== undefined) {
            query += `, max_drivers = $${idx++}`;
            params.push(max_drivers);
        }
        if (status) {
            query += `, status = $${idx++}`;
            params.push(status);
        }
        if (extend_trial_days) {
            query += `, trial_ends_at = NOW() + INTERVAL '${parseInt(extend_trial_days)} days'`;
        }

        query += ` WHERE id = $${idx++} RETURNING *`;
        params.push(id);

        const result = await db.query(query, params);
        res.json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating tenant' });
    }
}

module.exports = {
    ensureSuperAdmin,
    getAllTenants,
    updateTenant
};
