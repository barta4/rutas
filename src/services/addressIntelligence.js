const googleMaps = require('./googleMapsService');
const gemini = require('./geminiService');
const db = require('../config/db');

/**
 * Calcula la distancia en km entre dos puntos (Haversine)
 */
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la tierra en km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// ... (previous imports)

async function resolveAddress(rawAddress, context = {}) {
    if (!rawAddress) return null;

    const { city, neighborhood, depotLocation, maxDistanceKm = 50 } = context;

    // 0. Enriquecer con Código Postal desde DB
    let postalCode = null;
    if (city && neighborhood) {
        try {
            const res = await db.query('SELECT postal_code FROM service_areas WHERE city = $1 AND neighborhood = $2', [city, neighborhood]);
            if (res.rowCount > 0 && res.rows[0].postal_code) {
                postalCode = res.rows[0].postal_code;
                console.log(`📍 Postal Code Resolved for ${city}, ${neighborhood} (DB): ${postalCode}`);
            }
        } catch (e) {
            console.error('Error fetching postal code from DB:', e.message);
        }
    }

    // Paso 1: Intento Directo con Google Maps y Componentes
    const geoOptions = { city, neighborhood, postalCode };
    let geoResult = await googleMaps.geocodeAddress(rawAddress, geoOptions);

    // Evaluar calidad de geocodificación
    const isPrecise = geoResult && ['ROOFTOP', 'RANGE_INTERPOLATED'].includes(geoResult.location_type);

    // Validación de Distancia (si tenemos ubicación del depósito)
    let distanceAlert = false;
    let distanceKm = 0;

    if (geoResult && depotLocation && depotLocation.lat && depotLocation.lng) {
        distanceKm = getDistanceFromLatLonInKm(
            depotLocation.lat, depotLocation.lng,
            geoResult.coordinates.lat, geoResult.coordinates.lng
        );

        if (distanceKm > maxDistanceKm) {
            console.warn(`⚠️ Resultado Geocoding a ${distanceKm.toFixed(1)}km del depósito (Max: ${maxDistanceKm}km). Descartando o marcando.`);
            // Podríamos invalidar geoResult aquí si queremos ser estrictos
            // O simplemente bajarle el score / marcar riesgo
            distanceAlert = true;
        }
    }

    if (isPrecise && !distanceAlert) {
        console.log(`✅ Google Maps encontró match preciso: ${geoResult.location_type}`);
        return {
            final_address: geoResult.formatted_address,
            coordinates: geoResult.coordinates,
            ai_risk_score: 0.1, // Bajo riesgo
            ai_fix_notes: "Geocodificación directa exitosa",
            method: "direct_maps",
            postal_code: postalCode,
            distance_from_depot: distanceKm // Store logic distance
        };
    }

    // Paso 2: Intervención de IA (Gemini) - Si falló maps o hay alerta de distancia
    console.log(`⚠️ Dirección ambigua, imprecisa o lejana. Consultando a Gemini...`);

    // Incluir contexto en el prompt (simulado pasando string enriquecido)
    const contextString = `City: ${city || '?'}, Neighborhood: ${neighborhood || '?'}`;
    const addressWithContext = `${rawAddress} (${contextString})`;

    const aiNormalization = await gemini.normalizeAddress(addressWithContext);

    if (!aiNormalization) {
        // Fallback: Si Maps trajo algo (aunque sea Geometric Center o lejos), usémoslo con alto riesgo
        if (geoResult) {
            return {
                final_address: geoResult.formatted_address,
                coordinates: geoResult.coordinates,
                ai_risk_score: distanceAlert ? 0.95 : 0.8, // Muy alto riesgo si está lejos
                ai_fix_notes: distanceAlert
                    ? `FALLBACK: Ubicación a ${distanceKm.toFixed(1)}km del depósito.`
                    : "Calidad de geocodificación baja (APPROXIMATE)",
                method: "fallback_raw_maps"
            };
        }

        return {
            final_address: rawAddress,
            coordinates: null,
            ai_risk_score: 1.0,
            ai_fix_notes: "Fallo total: Maps sin resultados y Gemini no normalizó",
            method: "failure"
        };
    }

    console.log(`🤖 Gemini sugiere: "${aiNormalization.normalized_address}" (Conf: ${aiNormalization.confidence_score})`);

    // Paso 3: Re-intentar Google Maps con dirección normalizada por IA
    // Mantenemos los componentes (city/neighborhood) para asegurar que no nos mande a otro lado
    const geoResultImproved = await googleMaps.geocodeAddress(aiNormalization.normalized_address, geoOptions);

    if (geoResultImproved) {
        // Validar distancia nuevamente
        let improvedDistanceKm = 0;
        let improvedDistanceAlert = false;
        if (depotLocation && depotLocation.lat) {
            improvedDistanceKm = getDistanceFromLatLonInKm(
                depotLocation.lat, depotLocation.lng,
                geoResultImproved.coordinates.lat, geoResultImproved.coordinates.lng
            );
            if (improvedDistanceKm > maxDistanceKm) improvedDistanceAlert = true;
        }

        return {
            final_address: geoResultImproved.formatted_address,
            coordinates: geoResultImproved.coordinates,
            ai_risk_score: improvedDistanceAlert ? 0.9 : (1 - aiNormalization.confidence_score),
            ai_fix_notes: `Corregido por IA: ${aiNormalization.fix_reason}. ${improvedDistanceAlert ? `[ALERTA DISTANCIA ${improvedDistanceKm.toFixed(1)}km]` : ''}`,
            method: "ai_corrected"
        };
    }

    // Fallback final
    return {
        final_address: aiNormalization.normalized_address,
        coordinates: null, // Necesitará intervención manual
        ai_risk_score: 1.0,
        ai_fix_notes: "IA normalizó pero Maps no encontró coordenadas",
        method: "ai_only"
    };
}

module.exports = { resolveAddress };
