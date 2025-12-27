const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_123';

async function login(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    try {
        const result = await db.query('SELECT id, name, tenant_id, password_hash, active FROM drivers WHERE username = $1', [username]);

        if (result.rowCount === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const driver = result.rows[0];

        if (!driver.active) {
            return res.status(403).json({ error: 'Conductor inactivo. Contacte a su supervisor.' });
        }

        // Verify password
        // Note: For existing drivers without password, this might fail unless updated.
        const isMatch = await bcrypt.compare(password, driver.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generate Token with 'driver' role
        const token = jwt.sign(
            {
                id: driver.id,
                name: driver.name,
                tenant_id: driver.tenant_id,
                role: 'driver'
            },
            JWT_SECRET,
            { expiresIn: '12h' } // Longer session for mobile apps
        );

        res.json({
            token,
            driver: {
                id: driver.id,
                name: driver.name,
                username: username
            }
        });

    } catch (err) {
        console.error('Driver Login Error:', err);
        res.status(500).json({ error: 'Error interno de servidor' });
    }
}

module.exports = { login };
