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

        // 3. Lógica de Proximidad (Si hay orden activa)
        if (active_route_id) {
            // Buscar la orden activa para obtener sus coordenadas y metadatos IA
            const orderRes = await client.query(`
            SELECT id, coordinates, status, customer_name, ai_risk_score, estimated_arrival 
            FROM orders 
            WHERE id = $1 AND status IN ('pending', 'in_progress')
        `, [active_route_id]);

            if (orderRes.rowCount > 0) {
                const order = orderRes.rows[0];

                // Calcular distancia en metros usando PostGIS nativo
                const distRes = await client.query(`
                SELECT ST_Distance(
                    (SELECT last_location FROM drivers WHERE id = $1),
                    (SELECT coordinates FROM orders WHERE id = $2)
                ) as distance_meters
            `, [driverId, active_route_id]);

                const distance = Math.round(distRes.rows[0].distance_meters);
                // console.log(`📏 Distancia a orden ${order.id}: ${distance}m`);

                // Disparar evento si < 1000m (1km)
                if (distance < 1000 && distance > 0) {
                    // Extraemos coordenadas del objeto postgis (o usamos las del ping actual que están cerca)
                    // Para los links de navegación del Cliente -> usamos la ubicación del Driver? 
                    // NO, los links son para que el CLIENTE vea al driver, o para que el DRIVER vaya al cliente?
                    // El requerimiento dice: "enlaces de navegación (Waze/Google Maps)" en la integración de salida.
                    // Usualmente esto es para enviarle al conductor si no llegó, o al cliente para tracking?
                    // El brief dice: "Webhooks hacia n8n con datos de ETA y enlaces de navegación".
                    // Asumiremos que son links para que el Conductor navegue al destino (si se los mandamos por whatsapp) 
                    // O tracking link para el cliente.
                    // "Asegúrate de que el link de tracking para el cliente muestre la posición real del chofer".
                    // Generaremos links de destino (ubicación de la orden).

                    // Necesitamos extraer lat/lng de la orden para armar links.
                    // PostGIS devuelve binario por defecto, pero podemos pedir GeoJSON o Text.
                    const coordsRes = await client.query(`
                    SELECT ST_X(coordinates::geometry) as lng, ST_Y(coordinates::geometry) as lat 
                    FROM orders WHERE id = $1
                 `, [order.id]);
                    const { lat, lng } = coordsRes.rows[0];

                    const nav_waze = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
                    const nav_google = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

                    // Calculo ETA simple (Asumiendo 20km/h velocidad promedio urbana = 333 m/min)
                    const eta_minutes = Math.ceil(distance / 333);

                    webhookService.notifyN8n('driver_approaching', {
                        driver_id: driverId,
                        order_id: order.id,
                        distance_meters: distance,
                        eta_minutes: eta_minutes,
                        customer: order.customer_name,
                        ai_risk_score: order.ai_risk_score,
                        nav_waze,
                        nav_google_maps: nav_google,
                        tenant_id: tenant_id
                    });
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
