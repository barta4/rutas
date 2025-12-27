const { Client } = require('pg');
require('dotenv').config();

async function setup() {
    const password = 'Dcd404';
    const potentialUsers = ['postgres', 'root'];

    let validUser = null;
    let client = null;

    console.log('Probando credenciales...');

    for (const user of potentialUsers) {
        try {
            const connectionString = `postgres://${user}:${password}@localhost:5432/postgres`;
            console.log(`Intentando conectar con usuario: ${user}...`);
            client = new Client({ connectionString });
            await client.connect();
            console.log(`¡Éxito! Usuario válido: ${user}`);
            validUser = user;
            break;
        } catch (err) {
            console.log(`Fallo con usuario ${user}: ${err.message}`);
            if (client) await client.end().catch(() => { });
        }
    }

    if (!validUser) {
        console.error('No se pudo conectar con ninguno de los usuarios probados (postgres, root).');
        process.exit(1);
    }

    // Check if DB exists
    try {
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'logistica_db'");
        if (res.rowCount === 0) {
            console.log("Base de datos 'logistica_db' no existe. Creándola...");
            await client.query('CREATE DATABASE logistica_db');
            console.log("Base de datos creada.");
        } else {
            console.log("Base de datos 'logistica_db' ya existe.");
        }
    } catch (err) {
        console.error('Error verificando/creando base de datos:', err);
        process.exit(1);
    } finally {
        await client.end();
    }

    // Generate correct connection string for the app
    const finalConnectionString = `postgres://${validUser}:${password}@localhost:5432/logistica_db`;
    console.log(`\n--- RESULTADO ---`);
    console.log(`CONNECTION_STRING=${finalConnectionString}`);

    // Write to .env
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '../.env');

    let envContent = fs.readFileSync(envPath, 'utf8');
    // Replace DATABASE_URL line
    envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL=${finalConnectionString}`);
    fs.writeFileSync(envPath, envContent);
    console.log('.env actualizado.');
}

setup();
