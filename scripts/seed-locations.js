const db = require('../src/config/db');
const { POSTAL_CODES } = require('../src/config/postal_codes');

async function seedLocations() {
    console.log('🌱 Seeding Service Areas from configuration...');

    try {
        let count = 0;
        for (const [city, neighborhoods] of Object.entries(POSTAL_CODES)) {
            for (const [neighborhood, postalCode] of Object.entries(neighborhoods)) {
                await db.query(`
                    INSERT INTO service_areas (city, neighborhood, postal_code)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (city, neighborhood) DO NOTHING
                `, [city, neighborhood, postalCode]);
                count++;
            }
        }
        console.log(`✅ Seeded ${count} neighborhoods.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seedLocations();
