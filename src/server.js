const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const db = require('./config/db');

process.on('exit', (code) => {
    console.log(`Process exiting with code: ${code}`);
});

const path = require('path');

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
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads')); // Local/Direct access
app.use('/v1/uploads', express.static('uploads')); // Proxy-friendly access through /v1

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
app.post('/v1/auth/login', authController.login);
app.post('/v1/auth/register', authController.register); // Public Registration

const driverAuthController = require('./controllers/driverAuthController');
app.post('/v1/driver/auth/login', driverAuthController.login);

// Protected Routes (Example)
app.use('/v1', authMiddleware);

const { checkSaaSStatus, checkDriverLimit } = require('./middleware/tenantLimiter');
app.use('/v1', checkSaaSStatus); // Apply trial/suspension check to all API routes

const dashboardController = require('./controllers/dashboardController');
app.get('/v1/dashboard/stats', dashboardController.getStats);
app.get('/v1/dashboard/map-data', dashboardController.getMapData);

// Driver App Routes
const driverAppController = require('./controllers/driverAppController');
const multer = require('multer');
// Configure Multer Storage to keep extensions
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        // Extract extension from mimetype (e.g. image/jpeg -> .jpeg)
        const ext = file.mimetype.split('/')[1] || 'jpg';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + ext)
    }
});
const upload = multer({ storage: storage });

// app.post('/v1/driver/auth/login', driverAuthController.login); // Moved up
app.get('/v1/driver/route', driverAppController.getMyRoute);
app.post('/v1/driver/orders/:id/status', upload.single('photo'), driverAppController.updateOrderStatus);
app.post('/v1/driver/orders/:id/start', driverAppController.startOrder);

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
app.delete('/v1/orders/:id', ordersController.deleteOrder);
app.post('/v1/orders/geocode', ordersController.geocodeOrderAddress);
app.post('/v1/orders/optimize', ordersController.optimizeRouteHandler);
app.post('/v1/orders/geocode', ordersController.geocodeOrderAddress);
app.post('/v1/orders/optimize', ordersController.optimizeRouteHandler);
app.post('/v1/orders/sequence', ordersController.saveRouteSequence);
app.get('/v1/orders/loading-sheet', ordersController.getLoadingSheet); // New LIFO Route

const adminController = require('./controllers/adminController');
app.get('/v1/drivers', adminController.getDrivers);
app.get('/v1/drivers', adminController.getDrivers);
app.post('/v1/drivers', checkDriverLimit, adminController.createDriver);
app.put('/v1/drivers/:id', adminController.updateDriver);
app.delete('/v1/drivers/:id', adminController.deleteDriver);

app.get('/v1/me', (req, res) => {
    res.json({
        message: `Hola, ${req.tenant.name}`,
        tenant_id: req.tenant.id,
        config: req.tenant.config,
        is_super_admin: req.tenant.is_super_admin
    });
});

const superAdminController = require('./controllers/superAdminController');
app.get('/v1/admin/tenants', superAdminController.ensureSuperAdmin, superAdminController.getAllTenants);
app.get('/v1/admin/stats', superAdminController.ensureSuperAdmin, superAdminController.getDashboardStats);
app.post('/v1/admin/tenants/:id/impersonate', superAdminController.ensureSuperAdmin, superAdminController.impersonateTenant);
app.post('/v1/admin/tenants/:id/reset-password', superAdminController.ensureSuperAdmin, superAdminController.resetTenantPassword);
app.put('/v1/admin/tenants/:id', superAdminController.ensureSuperAdmin, superAdminController.updateTenant);

// System Settings Routes
app.get('/v1/admin/settings', superAdminController.ensureSuperAdmin, superAdminController.getSystemSettings);
app.put('/v1/admin/settings/:key', superAdminController.ensureSuperAdmin, superAdminController.updateSystemSetting);
// Public/Protected route for Integrations page to read settings (Authenticated users)
app.get('/v1/system/settings', authMiddleware, superAdminController.getSystemSettings);

const integrationsController = require('./controllers/integrationsController');
app.post('/v1/integrations/chatwoot/test', authMiddleware, integrationsController.testChatwoot);
app.post('/v1/integrations/:type', authMiddleware, integrationsController.saveIntegration);
app.get('/v1/integrations/:type', authMiddleware, integrationsController.getIntegration);

// Serve Frontend Static Files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Catch-All Route for SPA (Must be last)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// Integrations (Bridge)
const integrationsManager = require('./integrations');
integrationsManager.start();

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Servidor Logístico IA corriendo en http://localhost:${PORT}`);
});
