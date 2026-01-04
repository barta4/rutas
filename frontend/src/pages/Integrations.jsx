
import React, { useState, useEffect } from 'react';
import { Download, ShoppingBag, Database, Puzzle, Server, CheckCircle, X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Integrations() {
    const [selectedIntegration, setSelectedIntegration] = useState(null);
    const [configData, setConfigData] = useState({});

    // Catalog Data
    const integrations = [
        {
            id: 'android-app',
            category: 'mobile',
            name: 'App Conductores',
            description: 'Aplicación oficial para Android. Rastreo, pruebas de entrega y chat.',
            icon: <Download size={24} className="text-green-400" />,
            status: 'available',
            action: 'download',
            buttonText: 'Descargar APK'
        },
        {
            id: 'woocommerce',
            category: 'ecommerce',
            name: 'WooCommerce',
            description: 'Sincroniza pedidos automáticamente desde tu tienda WordPress.',
            icon: <ShoppingBag size={24} className="text-purple-400" />,
            status: 'available',
            action: 'configure',
            buttonText: 'Conectar'
        },
        {
            id: 'odoo',
            category: 'erp',
            name: 'Odoo Connector',
            description: 'Importación automática de pedidos cada 5 minutos. Soporta v14-v17.',
            icon: <Database size={24} className="text-purple-600" />,
            status: 'available',
            action: 'configure',
            price: '$3/mes',
            buttonText: 'Instalar'
        },
        {
            id: 'shopify',
            category: 'ecommerce',
            name: 'Shopify',
            description: 'Conecta tu tienda Shopify en segundos.',
            icon: <ShoppingBag size={24} className="text-green-500" />,
            status: 'coming_soon',
            action: 'none',
            buttonText: 'Pronto'
        },
        {
            id: 'dolibarr',
            category: 'erp',
            name: 'Dolibarr ERP',
            description: 'Gestión de flotas y pedidos desde Dolibarr.',
            icon: <Server size={24} className="text-blue-500" />,
            status: 'available',
            action: 'configure',
            buttonText: 'Conectar'
        },
        {
            id: 'api-access',
            category: 'dev',
            name: 'API Rest',
            description: 'Documentación completa para desarrolladores.',
            icon: <Puzzle size={24} className="text-orange-400" />,
            status: 'available',
            action: 'link',
            linkTo: '/dashboard/developers',
            buttonText: 'Ver Docs'
        }
    ];

    const handleSaveConfig = async (e) => {
        e.preventDefault();

        // Example logic to save depending on type
        const type = selectedIntegration.id; // 'odoo' or 'dolibarr'

        const form = e.target;
        const config = {
            url: form.url.value,
            // Common fields logic
            api_key: form.api_key?.value,
            db: form.db?.value,
            user: form.user?.value,
            // WooCommerce fields
            consumer_key: form.consumer_key?.value,
            consumer_secret: form.consumer_secret?.value
        };

        try {
            await api.post(`/integrations/${type}`, {
                config,
                is_active: true
            });
            alert(`¡${selectedIntegration.name} conectado exitosamente!`);
            setSelectedIntegration(null);
        } catch (err) {
            alert('Error al guardar integración');
            console.error(err);
        }
    };

    const [apkUrl, setApkUrl] = useState(null);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                // Assuming we use api instance which handles base URL and auth
                // Ideally this endpoint might be public for unauth access if needed, 
                // but since this page is dashboard, we have token.
                const res = await api.get('/system/settings');
                if (res.data.driver_app_url) setApkUrl(res.data.driver_app_url);
            } catch (e) {
                console.error('Error loading system settings', e);
            }
        };
        loadSettings();
    }, []);

    const handleAction = (item) => {
        if (item.action === 'configure') {
            setSelectedIntegration(item);
        } else if (item.action === 'download') {
            if (apkUrl) {
                window.open(apkUrl, '_blank');
            } else {
                alert('El enlace de descarga no ha sido configurado por el administrador.');
            }
        } else if (item.action === 'docs') {
            alert('Revisa la sección Webhooks en el menú lateral.');
        }
    };

    return (
        <div className="p-8 min-h-screen bg-black text-white">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
                    Tienda de Integraciones
                </h1>
                <p className="text-gray-400">Potencia tu logística conectando tus herramientas favoritas.</p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {integrations.map((item) => (
                    <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all group shadow-lg">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-zinc-800 rounded-lg group-hover:scale-110 transition-transform">
                                {item.icon}
                            </div>
                            {item.status === 'installed' && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-bold">INSTALADO</span>}
                            {item.status === 'coming_soon' && <span className="text-xs bg-zinc-800 text-gray-500 px-2 py-1 rounded font-bold">PRÓXIMAMENTE</span>}
                            {item.price && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded font-bold border border-blue-500/20">{item.price}</span>}
                        </div>

                        <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                            {item.name}
                        </h3>
                        <p className="text-gray-400 text-sm mb-6 h-10 line-clamp-2">
                            {item.description}
                        </p>

                        <div className="mt-auto">
                            {item.action === 'link' ? (
                                <Link to={item.linkTo} className="block w-full text-center bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 rounded-lg transition-colors">
                                    {item.buttonText}
                                </Link>
                            ) : (
                                <button
                                    onClick={() => handleAction(item)}
                                    disabled={item.status === 'coming_soon'}
                                    className={`w-full py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${item.status === 'coming_soon'
                                        ? 'bg-zinc-800 text-gray-600 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/20'
                                        }`}
                                >
                                    {item.action === 'download' && <Download size={16} />}
                                    {item.action === 'configure' && <Puzzle size={16} />}
                                    {item.buttonText}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Configuration Modal */}
            {selectedIntegration && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-lg shadow-2xl relative">
                        <button
                            onClick={() => setSelectedIntegration(null)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white"
                        >
                            <X size={24} />
                        </button>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-zinc-800 rounded-xl">
                                {selectedIntegration.icon}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Configurar {selectedIntegration.name}</h2>
                                <p className="text-gray-400 text-sm">Ingresa tus credenciales para conectar.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSaveConfig} className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase text-gray-400 font-bold mb-1">URL de la Tienda / ERP</label>
                                <input
                                    name="url"
                                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                    placeholder={selectedIntegration.id === 'woocommerce' ? 'https://mitienda.com' : 'https://mi-empresa.odoo.com'}
                                    required
                                />
                            </div>

                            {/* WooCommerce Specific Fields */}
                            {selectedIntegration.id === 'woocommerce' && (
                                <>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-400 font-bold mb-1">Consumer Key (CK)</label>
                                        <input
                                            name="consumer_key"
                                            className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                            placeholder="ck_xxxxxxxxxxxxxxxx"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-400 font-bold mb-1">Consumer Secret (CS)</label>
                                        <input
                                            name="consumer_secret"
                                            type="password"
                                            className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                            placeholder="cs_xxxxxxxxxxxxxxxx"
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            {/* Odoo / Dolibarr Specific Fields */}
                            {['odoo', 'dolibarr'].includes(selectedIntegration.id) && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs uppercase text-gray-400 font-bold mb-1">Base de Datos</label>
                                            <input
                                                name="db"
                                                className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                                placeholder={selectedIntegration.id === 'odoo' ? 'db_name' : 'No requerido'}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase text-gray-400 font-bold mb-1">Usuario / Email</label>
                                            <input
                                                name="user"
                                                className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                                placeholder="admin@..."
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase text-gray-400 font-bold mb-1">API Key / Contraseña</label>
                                        <input
                                            name="api_key"
                                            type="password"
                                            className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                            placeholder="••••••••••••"
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            <p className="text-xs text-gray-500 mt-1">Tus datos se guardan encriptados.</p>

                            <button className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl mt-4 flex items-center justify-center gap-2">
                                <CheckCircle size={18} /> Guardar y Activar
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
