const db = require('../src/config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const readline = require('readline');

require('dotenv').config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (str) => new Promise(resolve => rl.question(str, resolve));

async function createTenant() {
    try {
        console.log('\n🏢  Creación de Nuevo Tenant (Empresa)  🏢\n');

        const name = await question('Nombre de la Empresa: ');
        const email = await question('Email del Admin: ');
        const password = await question('Contraseña: ');

        console.log('\nGenerando API Key y Hash...');
        const apiKey = crypto.randomBytes(24).toString('hex');
        const hashedPassword = await bcrypt.hash(password, 10);

        const res = await db.query(`
            INSERT INTO tenants (name, email, password_hash, api_key, config)
            VALUES ($1, $2, $3, $4, '{"ai_enabled": true}')
            RETURNING id, name, email, api_key
        `, [name, email, hashedPassword, apiKey]);

        const newTenant = res.rows[0];
        console.log('\n✅  Tenant Creado Exitosamente!\n');
        console.table({
            ID: newTenant.id,
            Nombre: newTenant.name,
            Email: newTenant.email,
            'API Key': newTenant.api_key
        });

    } catch (err) {
        console.error('\n❌  Error creando tenant:', err.message);
        if (err.code === '23505') {
            console.error('   (El email ya está registrado)');
        }
    } finally {
        rl.close();
        await db.pool.end();
    }
}

createTenant();
