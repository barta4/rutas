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
        const { max_orders } = req.body;
        if (max_orders !== undefined) {
            query += `, max_orders = $${idx++}`;
            params.push(max_orders);
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

async function getDashboardStats(req, res) {
    try {
        const stats = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM tenants) as total_tenants,
                (SELECT COUNT(*) FROM tenants WHERE created_at > NOW() - INTERVAL '30 days') as new_tenants_month,
                (SELECT COUNT(*) FROM orders) as total_orders,
                (SELECT COUNT(*) FROM drivers WHERE active = true) as active_drivers
        `);
        res.json(stats.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error getting stats' });
    }
}

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

async function impersonateTenant(req, res) {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT * FROM tenants WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });

        const tenant = result.rows[0];

        // Generate Token
        const token = jwt.sign(
            { id: tenant.id, email: tenant.email, name: tenant.name, is_super_admin: tenant.is_super_admin },
            { id: tenant.id, email: tenant.email, name: tenant.name, is_super_admin: tenant.is_super_admin },
            process.env.JWT_SECRET || 'super_secret_jwt_key_123',
            { expiresIn: '1h' }
        );

        res.json({
            token,
            user: {
                id: tenant.id,
                name: tenant.name,
                email: tenant.email,
                api_key: tenant.api_key,
                is_super_admin: tenant.is_super_admin
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error impersonating' });
    }
}

async function resetTenantPassword(req, res) {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 chars' });
    }

    try {
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await db.query('UPDATE tenants SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, id]);
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error resetting password' });
    }
}

module.exports = {
    ensureSuperAdmin,
    getAllTenants,
    updateTenant,
    getDashboardStats,
    impersonateTenant,
    resetTenantPassword
};
