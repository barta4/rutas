const db = require('../config/db');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_123';

async function authMiddleware(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];

    // 1. Estrategia API Key (Sensores / Scripts)
    if (apiKey) {
        try {
            const result = await db.query('SELECT id, name, config, is_super_admin FROM tenants WHERE api_key = $1', [apiKey]);
            if (result.rowCount === 0) return res.status(403).json({ error: 'API Key inválida' });
            req.tenant = result.rows[0];
            req.authMethod = 'api_key';
            return next();
        } catch (err) {
            return res.status(500).json({ error: 'Auth Error' });
        }
    }

    // 2. Estrategia Bearer Token (Dashboard)
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET);

            // Support for Driver Login
            if (decoded.role === 'driver') {
                req.driver = decoded; // { id, name, tenant_id, role: 'driver' }
                req.authMethod = 'jwt_driver';
            } else {
                req.tenant = decoded; // { id, email, name ... }
                req.authMethod = 'jwt';
            }

            return next();
        } catch (err) {
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }
    }

    return res.status(401).json({ error: 'Autenticación requerida (x-api-key o Bearer Token)' });
}

module.exports = authMiddleware;
