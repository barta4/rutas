const axios = require('axios');
require('dotenv').config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Geocodifica una dirección usando Google Maps API via HTTP.
 * @param {string} address - Dirección a buscar.
 * @param {Object} [options] - Opciones adicionales para refinar la búsqueda.
 * @param {string} [options.city] - Ciudad (e.g., Montevideo).
 * @param {string} [options.neighborhood] - Barrio (e.g., Pocitos).
 * @param {string} [options.postalCode] - Código Postal.
 * @returns {Promise<Object|null>} - Retorna objeto con lat, lng, formatted_address y location_type.
 */
async function geocodeAddress(address, options = {}) {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'tu_google_maps_key_aqui') {
        console.warn('⚠️ Google Maps API Key no configurada.');
        return null;
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json`;

        // Construir componentes
        let components = 'country:UY';
        if (options.postalCode) {
            components += `|postal_code:${options.postalCode}`;
        }
        if (options.city) {
            components += `|locality:${options.city}`;
        }
        // Nota: 'neighborhood' no es un componente estándar fuerte de Google Maps, 
        // pero se puede intentar agregar a la dirección de texto si no está presente.

        let searchAddress = address;
        if (options.neighborhood && !searchAddress.toLowerCase().includes(options.neighborhood.toLowerCase())) {
            searchAddress += `, ${options.neighborhood}`;
        }
        if (options.city && !searchAddress.toLowerCase().includes(options.city.toLowerCase())) {
            searchAddress += `, ${options.city}`;
        }

        const response = await axios.get(url, {
            params: {
                address: searchAddress,
                key: GOOGLE_MAPS_API_KEY,
                components: components
            }
        });

        if (response.data.status !== 'OK') {
            console.warn(`Google Maps Geocode Error/ZeroResults: ${response.data.status}`);
            return null;
        }

        // Si hay múltiples resultados, intentamos filtrar por el más relevante si es necesario
        // Por ahora devolvemos el primero que suele ser el mejor match
        const result = response.data.results[0];
        const { lat, lng } = result.geometry.location;

        return {
            coordinates: { lat, lng },
            formatted_address: result.formatted_address,
            location_type: result.geometry.location_type, // ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE
            place_id: result.place_id,
            partial_match: result.partial_match
        };

    } catch (error) {
        console.error('Error en Google Maps Geocoding:', error.message);
        return null;
    }
}

module.exports = { geocodeAddress };
