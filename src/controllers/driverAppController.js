const db = require('../config/db');

// Get assigned orders for the logged-in driver
async function getMyRoute(req, res) {
    const driverId = req.driver.id;

    try {
        const result = await db.query(`
            SELECT 
                id, 
                customer_name, 
                customer_phone, 
                customer_cedula,
                address_text, 
                address_normalized, 
                status, 
                ST_X(coordinates::geometry) as lng, 
                ST_Y(coordinates::geometry) as lat,
                delivery_sequence,
                estimated_arrival
            FROM orders 
            WHERE driver_id = $1 
            AND status NOT IN ('completed', 'cancelled')
            ORDER BY delivery_sequence ASC NULLS LAST
        `, [driverId]);

        res.json({
            driver_name: req.driver.name,
            route: result.rows
        });

    } catch (err) {
        console.error('Get Route Error:', err);
        res.status(500).json({ error: 'Error al obtener la ruta' });
    }
}

// Update order status (Comprehensive Version)
async function updateOrderStatus(req, res) {
    const { id } = req.params; // Order ID
    const driverId = req.driver.id;

    // Multer puts fields in req.body and files in req.file/req.files
    const { status, proof_data_json } = req.body;

    if (!['completed', 'failed', 'in_progress'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
    }

    let proof_of_delivery = {};
    if (proof_data_json) {
        try {
            proof_of_delivery = JSON.parse(proof_data_json);
        } catch (e) {
            console.error("JSON Parse Error", e);
        }
    }

    // Handle Photo
    if (req.file) {
        // Add photo path to POD
        const photoUrl = `/uploads/${req.file.filename}`;
        proof_of_delivery.photos = proof_of_delivery.photos || [];
        proof_of_delivery.photos.push(photoUrl);
    }

    // Extract metadata for dedicated columns
    const { note, coordinates, distance_from_target } = proof_of_delivery;

    try {
        // Verify order belongs to driver
        const check = await db.query('SELECT id FROM orders WHERE id = $1 AND driver_id = $2', [id, driverId]);

        if (check.rowCount === 0) {
            return res.status(404).json({ error: 'Orden no encontrada o no asignada a usted' });
        }

        await db.query(`
            UPDATE orders 
            SET 
                status = $1, 
                proof_of_delivery = $2,
                completion_notes = $3,
                distance_from_target = $4,
                completion_coordinates = ST_SetSRID(ST_MakePoint($5, $6), 4326)
            WHERE id = $7
        `, [
            status,
            JSON.stringify(proof_of_delivery),
            note || null,
            distance_from_target || null,
            coordinates?.lng || 0,
            coordinates?.lat || 0,
            id
        ]);

        res.json({ message: 'Estado actualizado', order_id: id, new_status: status });

        // Notificar a n8n
        const { notifyN8n } = require('../services/webhookService');
        await notifyN8n('order_status_updated', {
            order_id: id,
            driver_id: driverId,
            new_status: status,
            proof: proof_of_delivery,
            timestamp: new Date().toISOString()
        });

        // Notificar a Chatwoot (Async)
        const chatwootService = require('../services/chatwootService');
        // Need to fetch full order details including tenant_id usually, but let's see. 
        // req.driver should have tenant_id. 
        // We also need customer info which might not be in the 'check' query above.
        // Let's refactor 'check' query to get customer details.

        // Refetched for notification context
        const orderDetails = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
        if (orderDetails.rowCount > 0 && req.driver && req.driver.tenant_id) {
            chatwootService.notifyStatusUpdate(req.driver.tenant_id, orderDetails.rows[0], status).catch(err => console.error('Chatwoot Async Error:', err));
        }

    } catch (err) {
        console.error('Update Status Error:', err);
        res.status(500).json({ error: 'Error al actualizar la orden' });
    }
}

const { notifyN8n } = require('../services/webhookService');

// Start Order (En Camino)
async function startOrder(req, res) {
    const { id } = req.params;
    const driverId = req.driver.id;

    try {
        // 1. Get current Driver Location (from body or derived/cached - assumed passed in body for now)
        const { lat, lng } = req.body;

        // 2. Get Order Coordinates
        const orderRes = await db.query(`
            SELECT 
                ST_X(coordinates::geometry) as target_lng, 
                ST_Y(coordinates::geometry) as target_lat,
                customer_name,
                address_text,
                notification_sent_starting
            FROM orders 
            WHERE id = $1 AND driver_id = $2
        `, [id, driverId]);

        if (orderRes.rowCount === 0) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        const order = orderRes.rows[0];

        // 3. Simple ETA Calculation (Euclidean for speed, or Haversine)
        // Avg speed: 30km/h = 8.33 m/s
        let etaMinutes = 15; // default fallback
        let distanceKm = 0;

        if (lat && lng && order.target_lat && order.target_lng) {
            const R = 6371; // km
            const dLat = (order.target_lat - lat) * Math.PI / 180;
            const dLon = (order.target_lng - lng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat * Math.PI / 180) * Math.cos(order.target_lat * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            distanceKm = R * c;

            // Time = Dist / Speed. 30km/h
            etaMinutes = Math.round((distanceKm / 30) * 60);
            if (etaMinutes < 5) etaMinutes = 5; // Minimum buffer
        }

        // 4. Update DB
        await db.query(`
            UPDATE orders 
            SET status = 'in_progress', 
                started_at = NOW(),
                notification_sent_starting = TRUE
            WHERE id = $1
        `, [id]);

        // 5. Send Webhook (Only if not already sent, or force send)
        // For "Start", we usually want to notify always if they click "Go"
        await notifyN8n('driver_started', {
            event: 'driver_started',
            order_id: id,
            driver_name: req.driver.name,
            customer_name: order.customer_name,
            address: order.address_text,
            eta_minutes: etaMinutes,
            distance_km: distanceKm.toFixed(2)
        });

        res.json({ message: 'Viaje iniciado', eta_minutes: etaMinutes });

    } catch (err) {
        console.error('Start Order Error:', err);
        res.status(500).json({ error: 'Error al iniciar viaje' });
    }
}

module.exports = { getMyRoute, updateOrderStatus, startOrder };
