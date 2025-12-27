const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_123';

async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    try {
        const result = await db.query('SELECT id, name, email, password_hash, config FROM tenants WHERE email = $1', [email]);

        if (result.rowCount === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const tenant = result.rows[0];
        const isMatch = await bcrypt.compare(password, tenant.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar Token
        const token = jwt.sign(
            { id: tenant.id, email: tenant.email, name: tenant.name },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: tenant.id,
                name: tenant.name,
                email: tenant.email,
                ai_enabled: tenant.config?.ai_enabled
            }
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Error interno de servidor' });
    }
}

module.exports = { login };
