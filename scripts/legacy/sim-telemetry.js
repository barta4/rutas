const db = require('./config/db');
const telemetryService = require('./services/telemetryService');

// Coordenadas demo (Montevideo)
const ORIGIN = { lat: -34.895781, lng: -56.149206 }; // Lejos
const TARGET = { lat: -34.905923, lng: -56.189431 }; // Av 18 de Julio 1234 (Orden mock)

async function simulateTrip() {
    try {
        console.log('🏁 Iniciando Simulación de Viaje...');

        // 1. Crear Driver Mock
        console.log('👤 Creando Driver Mock...');
        const driverRes = await db.query(`
            INSERT INTO drivers (name, active) VALUES ('Chofer Test', true) RETURNING id
        `);
        const driverId = driverRes.rows[0].id;
        console.log(`   Driver ID: ${driverId}`);

        // 2. Crear Orden Mock
        console.log('📦 Creando Orden Mock...');
        const orderRes = await db.query(`
            INSERT INTO orders (customer_name, coordinates, status) 
            VALUES ('Cliente Test', ST_SetSRID(ST_MakePoint($1, $2), 4326), 'in_progress') 
            RETURNING id
        `, [TARGET.lng, TARGET.lat]);
        const orderId = orderRes.rows[0].id;
        console.log(`   Order ID: ${orderId}`);

        // 3. Asignar ruta al driver
        await db.query(`UPDATE drivers SET active_route_id = $1 WHERE id = $2`, [orderId, driverId]);

        // 4. Enviar Telemetría (Lejos)
        console.log('\n📡 [T1] Enviando ping lejano (~5km)...');
        await telemetryService.processTelemetry(driverId, ORIGIN.lat, ORIGIN.lng);

        // 5. Enviar Telemetría (Cerca - Simulando acercamiento)
        console.log('\n📡 [T2] Enviando ping cercano (<1km)...');
        // Un punto muy cerca del target
        const NEAR_LAT = TARGET.lat + 0.001;
        const NEAR_LNG = TARGET.lng + 0.001;
        await telemetryService.processTelemetry(driverId, NEAR_LAT, NEAR_LNG);

        console.log('\n✅ Simulación completada. Revisa los logs arriba para ver el aviso de Webhook.');

    } catch (err) {
        console.error('❌ Error en simulación:', err);
    } finally {
        await db.pool.end();
    }
}

simulateTrip();
