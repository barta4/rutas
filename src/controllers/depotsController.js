const db = require('../config/db');

async function createDepot(req, res) {
    const tenantId = req.tenant.id;
    const { name, address_text, lat, lng } = req.body;

    try {
        const result = await db.query(`
            INSERT INTO depots (tenant_id, name, address_text, coordinates)
            VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326))
            RETURNING *
        `, [tenantId, name, address_text, lng, lat]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error creating depot:', err);
        res.status(500).json({ error: 'Error creating depot' });
    }
}

async function getDepots(req, res) {
    const tenantId = req.tenant.id;
    try {
        const result = await db.query(`
            SELECT id, name, address_text, 
                   ST_X(coordinates::geometry) as lng, 
                   ST_Y(coordinates::geometry) as lat 
            FROM depots 
            WHERE tenant_id = $1
            ORDER BY created_at DESC
        `, [tenantId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching depots:', err);
        res.status(500).json({ error: 'Error fetching depots' });
    }
}

async function updateDepot(req, res) {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { name, address_text, lat, lng } = req.body;

    try {
        let query = `UPDATE depots SET name = $1, address_text = $2`;
        let params = [name, address_text];
        let idx = 3;

        if (lat && lng) {
            query += `, coordinates = ST_SetSRID(ST_MakePoint($${idx}, $${idx + 1}), 4326)`;
            params.push(lng, lat);
            idx += 2;
        }

        query += ` WHERE id = $${idx} AND tenant_id = $${idx + 1} RETURNING *`;
        params.push(id, tenantId);

        const result = await db.query(query, params);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Depot not found' });

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating depot:', err);
        res.status(500).json({ error: 'Error updating depot' });
    }
}

async function deleteDepot(req, res) {
    const tenantId = req.tenant.id;
    const { id } = req.params;

    try {
        await db.query('DELETE FROM depots WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        res.json({ message: 'Depot deleted' });
    } catch (err) {
        console.error('Error deleting depot:', err);
        res.status(500).json({ error: 'Error deleting depot' });
    }
}

module.exports = { createDepot, getDepots, updateDepot, deleteDepot };
