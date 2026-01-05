const db = require('../config/db');
const { optimizeRoute } = require('../services/routeOptimizer');
const { resolveAddress } = require('../services/addressIntelligence');
const { geocodeAddress } = require('../services/googleMapsService'); // Mantener para fallback o uso directo si se requiere especificamente


async function createOrder(req, res) {


    const {
        customer_name,
        customer_phone,
        customer_cedula,
        address_text,
        city,          // Nuevo campo
        neighborhood,  // Nuevo campo
        lat,
        lng,
        driver_id,
        depot_id,
        delivery_sequence
    } = req.body;

    const tenantId = req.tenant.id; // From authMiddleware

    // --- Geocoding Refinado ---
    let finalLat = lat;
    let finalLng = lng;
    let finalAddress = address_text;
    let postalCodeResolved = null;
    let aiScore = 0;
    let aiNotes = null;

    if ((!finalLat || !finalLng) && address_text) {
        try {
            console.log(`🌍 Auto-geocoding: ${address_text} [${city || ''}, ${neighborhood || ''}]`);

            // Fetch Depot Location for Distance Validation
            let depotLocation = null;
            if (depot_id) {
                const depotRes = await db.query('SELECT ST_X(coordinates::geometry) as lng, ST_Y(coordinates::geometry) as lat FROM depots WHERE id = $1', [depot_id]);
                if (depotRes.rowCount > 0 && depotRes.rows[0].lat) {
                    depotLocation = { lat: depotRes.rows[0].lat, lng: depotRes.rows[0].lng };
                }
            }

            const geoResult = await resolveAddress(address_text, {
                city,
                neighborhood,
                depotLocation,
                maxDistanceKm: 60 // Configurable?
            });

            if (geoResult && geoResult.coordinates) {
                finalLat = geoResult.coordinates.lat;
                finalLng = geoResult.coordinates.lng;
                finalAddress = geoResult.final_address;
                postalCodeResolved = geoResult.postal_code;
                aiScore = geoResult.ai_risk_score;
                aiNotes = geoResult.ai_fix_notes;

                console.log(`✅ Geocoded to: ${finalLat}, ${finalLng} (Postal: ${postalCodeResolved})`);
            } else {
                console.warn('⚠️ No se pudo geocodificar la dirección.');
            }
        } catch (e) {
            console.error('Auto-geocode critical error:', e);
        }
    }

    try {
        const result = await db.query(`
            INSERT INTO orders (
                tenant_id, 
                customer_name, 
                customer_phone, 
                customer_cedula,
                address_text, 
                city,
                neighborhood,
                postal_code,
                coordinates, 
                status, 
                driver_id, 
                depot_id,
                delivery_sequence,
                ai_risk_score,
                ai_fix_notes,
                created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_MakePoint($9, $10), 4326), 'pending', $11, $12, $13, $14, $15, NOW()
            ) RETURNING id, customer_name
        `, [tenantId, customer_name, customer_phone, customer_cedula, finalAddress, city, neighborhood, postalCodeResolved, finalLng, finalLat, driver_id, depot_id, delivery_sequence, aiScore, aiNotes]);

        res.json({ message: 'Order created', order: result.rows[0] });
    } catch (err) {
        console.error('Create Order Error:', err);
        res.status(500).json({ error: 'Error creating order' });
    }
}

async function getOrders(req, res) {
    const tenantId = req.tenant.id;
    const { status } = req.query;

    try {
        let query = `
            SELECT 
                o.id, o.customer_name, o.customer_phone, o.customer_cedula, o.address_text, o.status, 
                o.delivery_sequence, o.created_at, o.proof_of_delivery, o.completion_notes,
                o.distance_from_target, o.driver_id, o.depot_id,
                d.name as driver_name,
                dp.name as depot_name
            FROM orders o
            LEFT JOIN drivers d ON o.driver_id = d.id
            LEFT JOIN depots dp ON o.depot_id = dp.id
            WHERE o.tenant_id = $1
        `;
        const params = [tenantId];

        if (status) {
            query += ' AND o.status = $2';
            params.push(status);
        } else {
            // Default View: Hide completed orders older than 24h to keep dashboard clean
            query += ` AND (
                o.status NOT IN ('completed', 'delivered', 'failed') 
                OR (o.updated_at IS NOT NULL AND o.updated_at > NOW() - INTERVAL '24 hours')
            )`;
        }

        query += ' ORDER BY o.created_at DESC LIMIT 200';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching orders' });
    }
}

async function updateOrder(req, res) {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const {
        customer_name, address_text, city, neighborhood, customer_phone, customer_cedula,
        driver_id, depot_id, delivery_sequence, status
    } = req.body;

    try {
        // Construct dynamic update query
        let query = 'UPDATE orders SET updated_at = NOW()';
        const params = [];
        let idx = 1;

        const addField = (col, val) => {
            if (val !== undefined) {
                query += `, ${col} = $${idx++}`;
                params.push(val);
            }
        };

        addField('customer_name', customer_name);
        addField('address_text', address_text);
        addField('city', city);
        addField('neighborhood', neighborhood);
        addField('customer_phone', customer_phone);
        addField('customer_cedula', customer_cedula);
        addField('driver_id', driver_id);
        addField('depot_id', depot_id);
        addField('delivery_sequence', delivery_sequence);
        addField('status', status);

        // Handle Coordinates Update
        const { lat, lng } = req.body;
        if (lat !== undefined && lng !== undefined) {
            query += `, coordinates = ST_SetSRID(ST_MakePoint($${idx++}, $${idx++}), 4326)`;
            params.push(lng, lat); // Point is (lng, lat)
        }

        query += ` WHERE id = $${idx++} AND tenant_id = $${idx++} RETURNING id`;
        params.push(id, tenantId);

        const result = await db.query(query, params);

        if (result.rowCount === 0) return res.status(404).json({ error: 'Order not found' });
        res.json({ message: 'Order updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating order' });
    }
}



async function optimizeRouteHandler(req, res) {
    const { driver_id, order_ids } = req.body;
    const tenantId = req.tenant.id;

    try {
        let orders = [];

        if (order_ids && order_ids.length > 0) {
            // Fetch specific orders
            const result = await db.query(`
                SELECT id, customer_name, address_text, ST_X(coordinates::geometry) as lng, ST_Y(coordinates::geometry) as lat
                FROM orders 
                WHERE id = ANY($1) AND tenant_id = $2
            `, [order_ids, tenantId]);
            orders = result.rows;
        } else if (driver_id) {
            // Fetch driver's pending orders
            const result = await db.query(`
                SELECT id, customer_name, address_text, ST_X(coordinates::geometry) as lng, ST_Y(coordinates::geometry) as lat
                FROM orders 
                WHERE driver_id = $1 AND tenant_id = $2 AND status IN ('pending', 'in_progress')
            `, [driver_id, tenantId]);
            orders = result.rows;
        } else {
            return res.status(400).json({ error: 'Must provide driver_id or order_ids' });
        }

        if (orders.length === 0) return res.json([]);

        // Determine Start Location
        let startLocation = { lat: -34.9011, lng: -56.1645 }; // Default Montevideo
        const { start_from } = req.body; // 'driver' or 'depot'

        if (start_from === 'depot') {
            // Get coordinates of the FIRST depot for this tenant (Simple version)
            // Or we could pass depot_id if we have multiple
            const depotRes = await db.query('SELECT ST_X(coordinates::geometry) as lng, ST_Y(coordinates::geometry) as lat FROM depots WHERE tenant_id = $1 LIMIT 1', [tenantId]);
            if (depotRes.rowCount > 0 && depotRes.rows[0].lat) {
                startLocation = { lat: depotRes.rows[0].lat, lng: depotRes.rows[0].lng };
            }
        } else if (driver_id) {
            // Default: Driver Location
            const driverRes = await db.query('SELECT ST_X(last_location::geometry) as lng, ST_Y(last_location::geometry) as lat FROM drivers WHERE id = $1', [driver_id]);
            if (driverRes.rowCount > 0 && driverRes.rows[0].lat) {
                startLocation = { lat: driverRes.rows[0].lat, lng: driverRes.rows[0].lng };
            }
        }

        // Run Optimization
        const optimized = optimizeRoute(orders, startLocation);

        res.json({
            route: optimized,
            startLocation: {
                ...startLocation,
                type: start_from === 'depot' ? 'depot' : 'driver'
            }
        });

    } catch (err) {
        console.error('Optimization Error:', err);
        res.status(500).json({ error: 'Optimization failed' });
    }
}

async function saveRouteSequence(req, res) {
    const { sequences } = req.body; // Array of { id, delivery_sequence }
    const tenantId = req.tenant.id;

    if (!sequences || !Array.isArray(sequences)) {
        return res.status(400).json({ error: 'Invalid sequences format' });
    }

    try {
        // Use a transaction for safety
        await db.query('BEGIN');

        for (const item of sequences) {
            await db.query(`
                UPDATE orders 
                SET delivery_sequence = $1, updated_at = NOW()
                WHERE id = $2 AND tenant_id = $3
            `, [item.delivery_sequence, item.id, tenantId]);
        }

        await db.query('COMMIT');
        res.json({ message: 'Sequence updated successfully' });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Save Sequence Error:', err);
        res.status(500).json({ error: 'Failed to update sequences' });
    }
}

module.exports = {
    createOrder,
    getOrders,
    updateOrder,
    optimizeRouteHandler,
    saveRouteSequence,
    deleteOrder,
    deleteOrder,
    geocodeOrderAddress,
    getLoadingSheet
};

async function getLoadingSheet(req, res) {
    const tenantId = req.tenant.id;
    const { driver_id } = req.query;

    if (!driver_id) {
        return res.status(400).json({ error: 'Driver ID required' });
    }

    try {
        // LIFO: Reverse current sequence
        // We want the LAST item in the route to be shown FIRST in the loading sheet (Bottom of truck)
        // Actually, "Loading List" usually means: Order 1 is at back? 
        // No, typically you load in Reverse Delivery Order.
        // Delivery: 1, 2, 3 ...
        // Load: 3, 2, 1 (3 goes in first, deep in truck).

        const result = await db.query(`
            SELECT 
                delivery_sequence, 
                customer_name, 
                address_text, 
                status
            FROM orders 
            WHERE tenant_id = $1 
            AND driver_id = $2
            AND status IN ('pending', 'in_progress')
            ORDER BY delivery_sequence DESC NULLS LAST
        `, [tenantId, driver_id]);

        res.json(result.rows);
    } catch (err) {
        console.error('Loading Sheet Error:', err);
        res.status(500).json({ error: 'Error generating loading sheet' });
    }
}

async function deleteOrder(req, res) {
    const tenantId = req.tenant.id;
    const { id } = req.params;

    try {
        await db.query('DELETE FROM orders WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        res.json({ message: 'Order deleted' });
    } catch (err) {
        console.error('Error deleting order:', err);
        res.status(500).json({ error: 'Error deleting order' });
    }
}

const { geocodeAddress } = require('../services/googleMapsService');

async function geocodeOrderAddress(req, res) {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: 'Address is required' });

    try {
        const result = await geocodeAddress(address);
        if (!result) return res.status(404).json({ error: 'Address not found on Maps' });

        res.json(result);
    } catch (err) {
        console.error('Geocode Controller Error:', err);
        res.status(500).json({ error: 'Geocoding failed' });
    }
}
