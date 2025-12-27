const telemetryService = require('../services/telemetryService');

async function receiveTelemetry(req, res) {
    const { driver_id, lat, lng } = req.body;

    if (!driver_id || !lat || !lng) {
        return res.status(400).json({ error: 'Faltan datos: driver_id, lat, lng' });
    }

    try {
        await telemetryService.processTelemetry(driver_id, parseFloat(lat), parseFloat(lng));
        res.json({ status: 'ok' });
    } catch (err) {
        res.status(500).json({ error: 'Error procesando telemetría' });
    }
}

module.exports = { receiveTelemetry };
