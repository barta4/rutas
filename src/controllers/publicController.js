const db = require('../config/db');

async function getOrderStatus(req, res) {
    const { id } = req.params;

    try {
        // Fetch order details. Join with driver to get location if active.
        const result = await db.query(`
            SELECT 
                o.id, o.status, o.estimated_arrival, o.customer_name,
                d.last_location, d.name as driver_name
            FROM orders o
            LEFT JOIN drivers d ON o.driver_id = d.id
            WHERE o.id = $1
        `, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = result.rows[0];

        // Construct response
        const response = {
            id: order.id,
            status: order.status,
            customer_name: order.customer_name, // Maybe partial?
            estimated_arrival: order.estimated_arrival,
            driver_name: order.driver_name
        };

        // Only include location if order is in progress ? Or always?
        // User said "asignar direcciones de los depositos para que las rutas se calculen mejor"
        // and "otra IA consulte el estado".
        // Let's return location if driver has one.
        if (order.last_location) {
            // Convert PostGIS point to easy format if raw, but usually requires ST_AsGeoJSON or similar if not handled by pg-types properly.
            // Wait, pg with geometry usually returns hex or object.
            // Let's fetch it as lat/lng.
        }

        // Refetch with ST_X/Y for simplicity if needed, or assume the client handles it.
        // Let's do a cleaner query.
    } catch (err) {
        console.error('Error fetching public order status:', err);
        res.status(500).json({ error: 'Error fetching status' });
    }
}

async function getOrderStatusV2(req, res) {
    const { id } = req.params;
    try {
        const result = await db.query(`
            SELECT 
                o.id, o.status, o.estimated_arrival, o.customer_name,
                d.name as driver_name,
                ST_X(d.last_location::geometry) as driver_lng,
                ST_Y(d.last_location::geometry) as driver_lat
            FROM orders o
            LEFT JOIN drivers d ON o.driver_id = d.id
            WHERE o.id = $1
        `, [id]);

        if (result.rowCount === 0) return res.status(404).json({ error: 'Order not found' });

        const order = result.rows[0];
        res.json({
            id: order.id,
            status: order.status,
            customer_name: order.customer_name,
            estimated_arrival: order.estimated_arrival,
            driver: order.driver_name ? {
                name: order.driver_name,
                location: (order.driver_lat && order.driver_lng) ? {
                    lat: order.driver_lat,
                    lng: order.driver_lng
                } : null
            } : null
        });

    } catch (err) {
        console.error('Error fetching public order status:', err);
        res.status(500).json({ error: 'Error fetching status' });
    }
}

module.exports = { getOrderStatus: getOrderStatusV2 };
