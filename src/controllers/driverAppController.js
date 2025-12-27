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

    } catch (err) {
        console.error('Update Status Error:', err);
        res.status(500).json({ error: 'Error al actualizar la orden' });
    }
}

module.exports = { getMyRoute, updateOrderStatus };
