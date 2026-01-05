const db = require('../config/db');

async function getLocations(req, res) {
    try {
        // Return grouped by City
        const result = await db.query('SELECT city, neighborhood, postal_code, id FROM service_areas ORDER BY city, neighborhood');

        // Transform to hierarchical structure
        const locations = {};
        result.rows.forEach(row => {
            if (!locations[row.city]) {
                locations[row.city] = [];
            }
            locations[row.city].push({
                id: row.id,
                name: row.neighborhood,
                postal_code: row.postal_code
            });
        });

        res.json(locations);
    } catch (err) {
        console.error('Error fetching locations:', err);
        res.status(500).json({ error: 'Error fetching locations' });
    }
}

async function createLocation(req, res) {
    const { city, neighborhood, postal_code } = req.body;

    // Simple validation
    if (!city || !neighborhood) {
        return res.status(400).json({ error: 'City and Neighborhood are required' });
    }

    try {
        const result = await db.query(`
            INSERT INTO service_areas (city, neighborhood, postal_code)
            VALUES ($1, $2, $3)
            ON CONFLICT (city, neighborhood) 
            DO UPDATE SET postal_code = EXCLUDED.postal_code
            RETURNING *
        `, [city, neighborhood, postal_code]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error creating location:', err);
        res.status(500).json({ error: 'Error creating location' });
    }
}

async function deleteLocation(req, res) {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM service_areas WHERE id = $1', [id]);
        res.json({ message: 'Location deleted' });
    } catch (err) {
        console.error('Error deleting location:', err);
        res.status(500).json({ error: 'Error deleting location' });
    }
}

module.exports = {
    getLocations,
    createLocation,
    deleteLocation
};
