const db = require('../config/db');

async function checkSaaSStatus(req, res, next) {
    if (!req.tenant) return next(); // Skip if not a tenant (e.g. driver or public)

    // 1. Check if Suspended
    if (req.tenant.status === 'suspended') {
        return res.status(402).json({ error: 'Cuenta suspendida. Contacte soporte.' });
    }

    // 2. Check Trial Expiration (only if not super admin)
    if (!req.tenant.is_super_admin) {
        if (new Date() > new Date(req.tenant.trial_ends_at)) {
            return res.status(402).json({ error: 'Período de prueba finalizado. Suscribase para continuar.' });
        }
    }

    next();
}

async function checkDriverLimit(req, res, next) {
    const tenant = req.tenant;
    if (tenant.is_super_admin) return next();

    try {
        const result = await db.query('SELECT COUNT(*) FROM drivers WHERE tenant_id = $1', [tenant.id]);
        const currentDrivers = parseInt(result.rows[0].count);

        if (currentDrivers >= tenant.max_drivers) {
            return res.status(403).json({
                error: `Límite de choferes alcanzado (${tenant.max_drivers}). Actualice su plan.`
            });
        }
        next();
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error verificando límites' });
    }
}

module.exports = { checkSaaSStatus, checkDriverLimit };
