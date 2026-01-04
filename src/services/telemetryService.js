const db = require('../config/db');
const webhookService = require('./webhookService');

/**
 * Procesa un ping de telemetría.
 * @param {string} driverId - UUID del conductor
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 */
async function processTelemetry(driverId, lat, lng) {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Guardar log histórico
        await client.query(`
      INSERT INTO location_logs (driver_id, location)
      VALUES ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326))
    `, [driverId, lat, lng]);

        // 2. Actualizar última ubicación del driver
        const updateRes = await client.query(`
      UPDATE drivers 
      SET last_location = ST_SetSRID(ST_MakePoint($3, $2), 4326),
          last_ping = NOW()
      WHERE id = $1
      RETURNING active_route_id, tenant_id
    `, [driverId, lat, lng]);

        if (updateRes.rowCount === 0) {
            throw new Error('Driver not found');
        }

        const { active_route_id, tenant_id } = updateRes.rows[0];

        // 3. Importar Chatwoot (Lazy load or top)
        const chatwootService = require('./chatwootService');

        // 3. Lógica de Proximidad (Si hay orden activa)
        // Buscamos ordenes en 'in_progress' asignadas al chofer
        const orderRes = await client.query(`
            SELECT 
                id, 
                customer_name, 
                customer_phone,
                customer_email,
                notification_sent_approaching,
                ST_X(coordinates::geometry) as target_lng, 
                ST_Y(coordinates::geometry) as target_lat
            FROM orders 
            WHERE driver_id = $1 
            AND status = 'in_progress'
            AND notification_sent_approaching = FALSE
            LIMIT 1
        `, [driverId]);

        if (orderRes.rowCount > 0) {
            const order = orderRes.rows[0];

            // Calcular distancia (PostGIS)
            const distRes = await client.query(`
                SELECT ST_Distance(
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                    ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
                ) as distance_meters
            `, [lng, lat, order.target_lng, order.target_lat]);

            const distance = distRes.rows[0].distance_meters;

            // Si está a menos de 500 metros
            if (distance < 500) {
                // Marcar como enviado INMEDIATAMENTE
                await client.query(`
                    UPDATE orders 
                    SET notification_sent_approaching = TRUE 
                    WHERE id = $1
                `, [order.id]);

                // Enviar Webhook
                webhookService.notifyN8n('driver_approaching', {
                    event: 'driver_approaching',
                    driver_id: driverId,
                    order_id: order.id,
                    customer_name: order.customer_name,
                    distance_meters: Math.round(distance),
                    timestamp: new Date().toISOString()
                });

                // Enviar Chatwoot
                if (tenant_id) {
                    chatwootService.notifyStatusUpdate(tenant_id, order, 'approaching')
                        .catch(err => console.error('[Telemetry] Chatwoot Approaching Error:', err.message));
                }
            }
        }


        await client.query('COMMIT');
        return { success: true };

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error procesando telemetría:', err);
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { processTelemetry };
