const googleMaps = require('./googleMapsService');
const gemini = require('./geminiService');

/**
 * Resuelve la ubicación final de un pedido usando IA Híbrida.
 * Flujo: Google Maps -> (Si bajo score) -> Gemini -> Google Maps
 */
async function resolveAddress(rawAddress) {
    if (!rawAddress) return null;
    let steps = [];

    // Paso 1: Intento Directo con Google Maps
    // console.log(`📍 Resolviendo: "${rawAddress}"`);
    let geoResult = await googleMaps.geocodeAddress(rawAddress);

    // Evaluar calidad de geocodificación
    // ROOFTOP y RANGE_INTERPOLATED son precisos. 
    // GEOMETRIC_CENTER y APPROXIMATE suelen ser calles enteras o barrios.
    const isPrecise = geoResult && ['ROOFTOP', 'RANGE_INTERPOLATED'].includes(geoResult.location_type);

    if (isPrecise) {
        console.log(`✅ Google Maps encontró match preciso: ${geoResult.location_type}`);
        return {
            final_address: geoResult.formatted_address,
            coordinates: geoResult.coordinates,
            ai_risk_score: 0.1, // Bajo riesgo
            ai_fix_notes: "Geocodificación directa exitosa",
            method: "direct_maps"
        };
    }

    // Paso 2: Intervención de IA (Gemini)
    console.log(`⚠️ Dirección ambigua o imprecisa. Consultando a Gemini...`);
    const aiNormalization = await gemini.normalizeAddress(rawAddress);

    if (!aiNormalization) {
        // Fallback si Gemini falla: devolver lo mejor que encontró Maps originalmente o error
        return {
            final_address: geoResult ? geoResult.formatted_address : rawAddress,
            coordinates: geoResult ? geoResult.coordinates : null,
            ai_risk_score: 0.9,
            ai_fix_notes: "Fallo en IA, resultado original crudo",
            method: "fallback_raw"
        };
    }

    console.log(`🤖 Gemini sugiere: "${aiNormalization.normalized_address}" (Conf: ${aiNormalization.confidence_score})`);

    // Paso 3: Re-intentar Google Maps con dirección normalizada
    const geoResultImproved = await googleMaps.geocodeAddress(aiNormalization.normalized_address);

    if (geoResultImproved) {
        return {
            final_address: geoResultImproved.formatted_address,
            coordinates: geoResultImproved.coordinates,
            ai_risk_score: 1 - aiNormalization.confidence_score, // Si confianza es 0.9, riesgo es 0.1
            ai_fix_notes: `Corregido por IA: ${aiNormalization.fix_reason}`,
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

module.exports = { resolveLocation };
