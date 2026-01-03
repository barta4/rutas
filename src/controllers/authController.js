const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_123';

async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    console.log('Login attempt for:', email);

    try {
        const result = await db.query('SELECT id, name, email, password_hash, config, is_super_admin FROM tenants WHERE email = $1', [email]);

        if (result.rowCount === 0) {
            console.log('Login failed: User not found in DB');
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const tenant = result.rows[0];
        console.log('User found. Hash in DB:', tenant.password_hash.substring(0, 10) + '...');

        const isMatch = await bcrypt.compare(password, tenant.password_hash);
        console.log('Password match result:', isMatch);

        if (!isMatch) {
            console.log('Login failed: Password mismatch');
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar Token
        const token = jwt.sign(
            { id: tenant.id, email: tenant.email, name: tenant.name, is_super_admin: tenant.is_super_admin },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: tenant.id,
                name: tenant.name,
                email: tenant.email,
                ai_enabled: tenant.config?.ai_enabled,
                is_super_admin: tenant.is_super_admin
            }
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Error interno de servidor' });
    }
}

async function register(req, res) {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nombre, email y contraseña requeridos' });
    }

    try {
        // Check if exists
        const exists = await db.query('SELECT id FROM tenants WHERE email = $1', [email]);
        if (exists.rowCount > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const crypto = require('crypto');
        const apiKey = crypto.randomBytes(24).toString('hex');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create Tenant with Trial (14 days) and Free Tier Limits
        const result = await db.query(`
            INSERT INTO tenants (
                name, 
                email, 
                password_hash, 
                api_key, 
                config, 
                trial_ends_at, 
                max_drivers, 
                max_orders, 
                status
            ) VALUES (
                $1, $2, $3, $4, 
                '{"ai_enabled": true}', 
                NOW() + INTERVAL '14 days', 
                5, 
                100, 
                'active'
            ) RETURNING id, name, email, trial_ends_at
        `, [name, email, hashedPassword, apiKey]);

        const newTenant = result.rows[0];

        // Auto-Login
        const token = jwt.sign(
            { id: newTenant.id, email: newTenant.email, name: newTenant.name },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(201).json({
            message: 'Registro exitoso',
            token,
            user: {
                id: newTenant.id,
                name: newTenant.name,
                email: newTenant.email,
                trial_ends_at: newTenant.trial_ends_at
            }
        });

    } catch (err) {
        console.error('Register Error:', err);
        res.status(500).json({ error: 'Error registrando empresa' });
    }
}

module.exports = { login, register };
