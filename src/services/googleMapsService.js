const axios = require('axios');
require('dotenv').config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Geocodifica una dirección usando Google Maps API via HTTP.
 * @param {string} address - Dirección a buscar.
 * @returns {Promise<Object|null>} - Retorna objeto con lat, lng, formatted_address y location_type.
 */
async function geocodeAddress(address) {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'tu_google_maps_key_aqui') {
        console.warn('⚠️ Google Maps API Key no configurada.');
        return null;
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json`;
        const response = await axios.get(url, {
            params: {
                address: address,
                key: GOOGLE_MAPS_API_KEY,
                components: 'country:UY' // Restringir a Uruguay
            }
        });

        if (response.data.status !== 'OK') {
            console.warn(`Google Maps Geocode Error/ZeroResults: ${response.data.status}`);
            return null;
        }

        const result = response.data.results[0];
        const { lat, lng } = result.geometry.location;

        return {
            coordinates: { lat, lng },
            formatted_address: result.formatted_address,
            location_type: result.geometry.location_type, // ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE
            place_id: result.place_id
        };

    } catch (error) {
        console.error('Error en Google Maps Geocoding:', error.message);
        return null;
    }
}

module.exports = { geocodeAddress };
