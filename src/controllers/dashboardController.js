const db = require('../config/db');

async function getStats(req, res) {
    const tenantId = req.tenant.id;

    try {
        const stats = {
            active_drivers: 0,
            pending_orders: 0,
            completed_orders_today: 0,
            alerts_triggered: 0 // Placeholder
        };

        // Parallel queries for speed
        const [driversRes, ordersRes] = await Promise.all([
            db.query('SELECT COUNT(*) FROM drivers WHERE tenant_id = $1 AND active = true', [tenantId]),
            db.query('SELECT status, COUNT(*) FROM orders WHERE tenant_id = $1 GROUP BY status', [tenantId])
        ]);

        stats.active_drivers = parseInt(driversRes.rows[0].count);

        ordersRes.rows.forEach(row => {
            if (row.status === 'pending' || row.status === 'in_progress') {
                stats.pending_orders += parseInt(row.count);
            }
            if (row.status === 'completed') {
                stats.completed_orders_today += parseInt(row.count);
            }
        });

        res.json(stats);
    } catch (err) {
        console.error('Stats Error:', err);
        res.status(500).json({ error: 'Error obteniendo estadisticas' });
    }
}

async function getMapData(req, res) {
    const tenantId = req.tenant.id;

    try {
        // Fetch active drivers
        const drivers = await db.query(`
            SELECT id, name, ST_X(last_location::geometry) as lng, ST_Y(last_location::geometry) as lat, active_route_id 
            FROM drivers 
            WHERE tenant_id = $1 AND active = true AND last_location IS NOT NULL
        `, [tenantId]);

        // Fetch active orders + Completed Today
        const orders = await db.query(`
            SELECT id, customer_name, status, ai_risk_score, ST_X(coordinates::geometry) as lng, ST_Y(coordinates::geometry) as lat
            FROM orders 
            WHERE tenant_id = $1 
            AND (
                status IN ('pending', 'in_progress')
                OR (status = 'completed' AND updated_at >= CURRENT_DATE)
            )
        `, [tenantId]);

        res.json({
            drivers: drivers.rows,
            orders: orders.rows
        });

    } catch (err) {
        console.error('Map Data Error:', err);
        res.status(500).json({ error: 'Error obteniendo datos del mapa' });
    }
}

module.exports = { getStats, getMapData };
