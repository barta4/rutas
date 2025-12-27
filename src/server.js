const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const db = require('./config/db');

process.on('exit', (code) => {
    console.log(`Process exiting with code: ${code}`);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware Global
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Handle multiparts
app.use('/uploads', express.static('uploads')); // Serve images

// Ensure uploads dir exists
const fs = require('fs-extra');
fs.ensureDirSync('./uploads');

// Routes
app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'OK', db: 'connected', version: '1.0.0' });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', db: 'disconnected', error: err.message });
    }
});

const authController = require('./controllers/authController');
app.post('/auth/login', authController.login);

const driverAuthController = require('./controllers/driverAuthController');
app.post('/v1/driver/auth/login', driverAuthController.login);

// Protected Routes (Example)
app.use('/v1', authMiddleware);

const dashboardController = require('./controllers/dashboardController');
app.get('/v1/dashboard/stats', dashboardController.getStats);
app.get('/v1/dashboard/map-data', dashboardController.getMapData);

// Driver App Routes
const driverAppController = require('./controllers/driverAppController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// app.post('/v1/driver/auth/login', driverAuthController.login); // Moved up
app.get('/v1/driver/route', driverAppController.getMyRoute);
app.post('/v1/driver/orders/:id/status', upload.single('photo'), driverAppController.updateOrderStatus);

const telemetryController = require('./controllers/telemetryController');
app.post('/v1/telemetry', telemetryController.receiveTelemetry);

// Webhooks Routes
const webhookController = require('./controllers/webhookController');
app.get('/v1/webhooks', webhookController.getWebhooks);
app.post('/v1/webhooks', webhookController.createWebhook);
app.delete('/v1/webhooks/:id', webhookController.deleteWebhook);

const depotsController = require('./controllers/depotsController');
app.get('/v1/depots', depotsController.getDepots);
app.post('/v1/depots', depotsController.createDepot);
app.put('/v1/depots/:id', depotsController.updateDepot);
app.delete('/v1/depots/:id', depotsController.deleteDepot);

const companyController = require('./controllers/companyController');
app.get('/v1/company', companyController.getCompanySettings);
app.put('/v1/company', companyController.updateCompanySettings);

const publicController = require('./controllers/publicController');
app.get('/public/orders/:id', publicController.getOrderStatus); // Public access


const ordersController = require('./controllers/ordersController');
app.post('/v1/orders', ordersController.createOrder);
app.get('/v1/orders', ordersController.getOrders);
app.put('/v1/orders/:id', ordersController.updateOrder);
app.post('/v1/orders/optimize', ordersController.optimizeRouteHandler);
app.post('/v1/orders/sequence', ordersController.saveRouteSequence);

const adminController = require('./controllers/adminController');
app.get('/v1/drivers', adminController.getDrivers);
app.post('/v1/drivers', adminController.createDriver);
app.put('/v1/drivers/:id', adminController.updateDriver);
app.delete('/v1/drivers/:id', adminController.deleteDriver);

app.get('/v1/me', (req, res) => {
    res.json({
        message: `Hola, ${req.tenant.name}`,
        tenant_id: req.tenant.id,
        config: req.tenant.config
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Servidor Logístico IA corriendo en http://localhost:${PORT}`);
});
