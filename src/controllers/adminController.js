const db = require('../config/db');
const bcrypt = require('bcryptjs');

// --- DRIVERS ---

async function getDrivers(req, res) {
    const tenantId = req.tenant.id;
    try {
        const result = await db.query(`
            SELECT id, name, username, vehicle_info, active, last_location, last_seen_at 
            FROM drivers 
            WHERE tenant_id = $1 
            ORDER BY name ASC
        `, [tenantId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching drivers:', err);
        res.status(500).json({ error: 'Error fetching drivers' });
    }
}

async function createDriver(req, res) {
    const tenantId = req.tenant.id;
    const { name, username, password, vehicle_info } = req.body;

    // console.log('Creating driver:', { tenantId, name, username, vehicle_info }); // DEBUG LOG

    if (!name || !username || !password) {
        return res.status(400).json({ error: 'Faltan datos requeridos (name, username, password)' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.query(`
            INSERT INTO drivers (tenant_id, name, username, password_hash, vehicle_info, active)
            VALUES ($1, $2, $3, $4, $5, true)
            RETURNING id, name, username
        `, [tenantId, name, username, hashedPassword, vehicle_info]);

        // console.log('Driver created:', result.rows[0]); // DEBUG LOG
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating driver:', err);
        if (err.code === '23505') return res.status(400).json({ error: 'El nombre de usuario ya existe' });
        res.status(500).json({ error: 'Error interno al crear chofer' });
    }
}

async function updateDriver(req, res) {
    const tenantId = req.tenant.id;
    const { id } = req.params;
    const { name, username, password, vehicle_info, active } = req.body;

    try {
        let query = 'UPDATE drivers SET name = $1, username = $2, vehicle_info = $3, active = $4';
        let params = [name, username, vehicle_info, active];

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ', password_hash = $5';
            params.push(hashedPassword);
            query += ' WHERE id = $6 AND tenant_id = $7';
            params.push(id, tenantId);
        } else {
            query += ' WHERE id = $5 AND tenant_id = $6';
            params.push(id, tenantId);
        }

        const result = await db.query(query + ' RETURNING id, name', params);

        if (result.rowCount === 0) return res.status(404).json({ error: 'Driver not found' });
        res.json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating driver' });
    }
}

async function deleteDriver(req, res) {
    const tenantId = req.tenant.id;
    const { id } = req.params;

    try {
        await db.query('DELETE FROM drivers WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        res.json({ message: 'Driver deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error deleting driver' });
    }
}

module.exports = { getDrivers, createDriver, updateDriver, deleteDriver };
