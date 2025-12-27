import { Link } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { motion } from 'framer-motion';
import { Activity, Truck, Package, AlertTriangle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Marker Icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [mapData, setMapData] = useState({ drivers: [], orders: [] });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const statsRes = await api.get('/dashboard/stats');
                setStats(statsRes.data);

                const mapRes = await api.get('/dashboard/map-data');
                setMapData(mapRes.data);
            } catch (err) {
                console.error('Error fetching dashboard data', err);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000); // Polling cada 5s
        return () => clearInterval(interval);
    }, []);

    const [mapStyle, setMapStyle] = useState('dark'); // 'dark' | 'light'

    return (
        <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <StatCard icon={<Truck />} label="Drivers Activos" value={stats?.active_drivers ?? '-'} color="text-blue-400" />
                <StatCard icon={<Package />} label="Pedidos Pendientes" value={stats?.pending_orders ?? '-'} color="text-yellow-400" />
                <StatCard icon={<Activity />} label="Completados Hoy" value={stats?.completed_orders_today ?? '-'} color="text-green-400" />
                <StatCard icon={<AlertTriangle />} label="Alertas Riesgo" value={stats?.alerts_triggered ?? '0'} color="text-red-400" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-dark-800 border border-white/10 rounded-2xl overflow-hidden h-[600px] shadow-2xl relative"
            >
                {/* Live Indicator */}
                <div className="absolute top-4 left-4 z-[400] bg-dark-900/80 backdrop-blur px-3 py-1 rounded-full text-xs border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-2"></span>
                    Actualización en vivo
                </div>

                {/* Map Controls (Style & Legend) */}
                <div className="absolute top-4 right-4 z-[5000] flex flex-col items-end gap-2">
                    <div className="bg-dark-900/80 backdrop-blur p-1 rounded-lg border border-white/10 flex">
                        <button
                            onClick={() => setMapStyle('dark')}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${mapStyle === 'dark' ? 'bg-dark-700 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            🌑 Dark
                        </button>
                        <button
                            onClick={() => setMapStyle('light')}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${mapStyle === 'light' ? 'bg-gray-200 text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            ☀️ Light
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <div className="bg-dark-900/80 backdrop-blur px-2 py-1 rounded flex items-center gap-1 border border-white/10">
                            <span className="w-3 h-3 rounded-full bg-green-400"></span> <span className="text-xs text-white">Completado</span>
                        </div>
                        <div className="bg-dark-900/80 backdrop-blur px-2 py-1 rounded flex items-center gap-1 border border-white/10">
                            <span className="w-3 h-3 rounded-full bg-yellow-400"></span> <span className="text-xs text-white">Pendiente</span>
                        </div>
                    </div>
                </div>

                <MapContainer center={[-34.9011, -56.1645]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url={mapStyle === 'dark'
                            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
                        attribution='&copy; CARTO'
                    />

                    {/* Drivers */}
                    {Array.isArray(mapData?.drivers) && mapData.drivers.map(driver => (
                        <Marker key={driver.id} position={[driver.lat, driver.lng]}>
                            <Popup>
                                <div className="text-black">
                                    <strong>🚛 {driver.name}</strong><br />
                                    Ruta: {driver.active_route_id ? 'En via' : 'Libre'}
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Orders */}
                    {Array.isArray(mapData?.orders) && mapData.orders
                        .filter(order => order.lat && order.lng) // Filter invalid coordinates
                        .map(order => (
                            <Marker
                                key={order.id}
                                position={[order.lat, order.lng]}
                                opacity={0.8}
                                icon={L.divIcon({
                                    className: 'custom-icon',
                                    html: `<div style="background-color: ${order.status === 'completed' ? '#4ade80' : '#facc15'}; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 10px ${order.status === 'completed' ? '#4ade80' : '#facc15'}; border: 2px solid white;"></div>`
                                })}
                            >
                                <Popup>
                                    <div className="text-black text-sm">
                                        <strong>{order.status === 'completed' ? '✅' : '📦'} {order.customer_name}</strong><br />
                                        Estado: {order.status}<br />
                                        Riesgo IA: {(order.ai_risk_score * 100).toFixed(0)}%
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                </MapContainer>
            </motion.div>
        </div>
    );
};

const StatCard = ({ icon, label, value, color }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="bg-dark-800 border border-white/10 p-5 rounded-xl flex items-center gap-4 shadow-lg"
    >
        <div className={`p-3 rounded-lg bg-white/5 ${color}`}>
            {React.cloneElement(icon, { size: 24 })}
        </div>
        <div>
            <p className="text-gray-400 text-sm">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </motion.div>
);

export default Dashboard;
