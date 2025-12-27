import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Save, RefreshCw, ArrowLeft, Truck } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Dynamic Polyline Component to zoom to bounds
function MapBounds({ markers }) {
    const map = useMap();
    useEffect(() => {
        if (markers.length > 0) {
            const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [markers, map]);
    return null;
}

export default function RouteSimulator() {
    const { driverId } = useParams();
    const navigate = useNavigate();
    const [stops, setStops] = useState([]); // { ...order, lat, lng }
    const [startLocation, setStartLocation] = useState(null);
    const [driver, setDriver] = useState(null);
    const [loading, setLoading] = useState(true); // Default loading true
    const [startPoint, setStartPoint] = useState('driver'); // 'driver' or 'depot'
    const [mapStyle, setMapStyle] = useState('light'); // Default Light

    useEffect(() => {
        fetchData();
    }, [driverId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [driverRes] = await Promise.all([
                api.get(`/drivers`),
            ]);

            // Now using new response format { route, startLocation }
            const routeRes = await api.post('/orders/optimize', { driver_id: driverId, start_from: startPoint }); // use startPoint state? Initially standard.

            if (routeRes.data.route) {
                setStops(routeRes.data.route);
                setStartLocation(routeRes.data.startLocation);
            } else {
                setStops(routeRes.data); // Fallback
            }

            const foundDriver = driverRes.data.find(d => d.id === driverId);
            setDriver(foundDriver);

        } catch (e) {
            console.error(e);
            alert('Error cargando simulador');
            setStops([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOptimize = async () => {
        setLoading(true);
        try {
            const res = await api.post('/orders/optimize', {
                driver_id: driverId,
                start_from: startPoint
            });

            if (res.data.route) {
                setStops(res.data.route);
                setStartLocation(res.data.startLocation);
            } else {
                setStops(res.data);
            }

            alert(`Ruta recalculada desde: ${startPoint === 'driver' ? 'Ubicación Chofer' : 'Depósito'}`);
        } catch (e) {
            console.error(e);
            alert('Error optimizando');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!confirm('¿Confirmar esta secuencia de ruta?')) return;
        setLoading(true);
        try {
            const sequences = stops.map((stop, index) => ({
                id: stop.id,
                delivery_sequence: index + 1
            }));
            await api.post('/orders/sequence', { sequences });
            alert('Secuencia guardada con éxito');
            navigate('/dashboard/orders');
        } catch (e) {
            console.error(e);
            alert('Error guardando');
        } finally {
            setLoading(false);
        }
    };

    // Calculate line positions including start location
    const linePositions = [];
    if (startLocation && startLocation.lat) {
        linePositions.push([startLocation.lat, startLocation.lng]);
    }
    if (Array.isArray(stops)) {
        stops.filter(s => s && s.lat && s.lng).forEach(s => linePositions.push([s.lat, s.lng]));
    }

    if (loading && stops.length === 0 && !driver) {
        return (
            <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-dark-900 text-white flex-col gap-4">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <p>Cargando simulador...</p>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row bg-dark-900">
            {/* Sidebar List */}
            <div className="w-full md:w-1/3 bg-dark-800 p-4 border-r border-white/10 flex flex-col h-full overflow-hidden">
                <div className="mb-4 flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
                        <ArrowLeft />
                    </button>
                    <h2 className="text-xl font-bold text-white flex gap-2 items-center">
                        <Truck size={20} className="text-primary-400" />
                        {driver ? driver.name : 'Simulador'}
                    </h2>
                </div>

                {/* Info Box */}
                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg mb-4 text-xs text-blue-200">
                    <p className="font-bold mb-1">Punto de Partida:</p>
                    <div className="flex bg-dark-900 rounded-lg p-1 border border-white/10 mt-2">
                        <button
                            onClick={() => setStartPoint('driver')}
                            className={`flex-1 py-1 rounded text-center transition-colors ${startPoint === 'driver' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            📍 Chofer Hoy
                        </button>
                        <button
                            onClick={() => setStartPoint('depot')}
                            className={`flex-1 py-1 rounded text-center transition-colors ${startPoint === 'depot' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            🏢 Depósito
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 mb-4">
                    <button
                        onClick={handleOptimize}
                        disabled={loading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex justify-center items-center gap-2"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Calculando...' : 'Re-Optimizar'}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex justify-center items-center gap-2"
                    >
                        <Save size={18} /> Guardar
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {(!stops || stops.length === 0) && <p className="text-gray-500 text-center mt-10">Sin paradas asignadas</p>}
                    {Array.isArray(stops) && stops.map((stop, idx) => (
                        <div key={stop.id || idx} className="bg-dark-900 p-3 rounded-lg border border-white/5 hover:border-primary-500/50 transition-colors flex gap-3">
                            <div className="flex flex-col items-center justify-center min-w-[30px]">
                                <span className="text-xs text-gray-400">#{idx + 1}</span>
                                <div className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-xs font-bold border border-primary-500/50 mt-1">
                                    {stop.delivery_sequence || idx + 1}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-medium text-white text-sm">{stop.customer_name || 'Sin Nombre'}</h4>
                                <p className="text-xs text-gray-400 truncate">{stop.address_text || 'Sin Dirección'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Map View */}
            <div className="w-full md:w-2/3 h-full relative z-0">
                <div className="absolute top-4 right-4 z-[5000] bg-dark-900/80 backdrop-blur p-1 rounded-lg border border-white/10 flex">
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

                <MapContainer center={[-34.9011, -56.1645]} zoom={12} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                    <TileLayer
                        url={mapStyle === 'dark'
                            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
                        attribution='&copy; CARTO'
                    />

                    {startLocation && startLocation.lat && (
                        <Marker
                            position={[startLocation.lat, startLocation.lng]}
                            icon={L.divIcon({
                                className: 'custom-pin',
                                html: `<div style="background-color: ${startLocation.type === 'depot' ? '#ef4444' : '#10b981'}; color: white; width: 30px; height: 30px; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white;">${startLocation.type === 'depot' ? '🏢' : '🚛'}</div>`
                            })}
                        >
                            <Popup>
                                <strong>Punto de Partida</strong><br />
                                {startLocation.type === 'depot' ? 'Depósito Central' : 'Ubicación Actual Chofer'}
                            </Popup>
                        </Marker>
                    )}

                    {Array.isArray(stops) && stops.length > 0 && (
                        <MapBounds markers={stops.filter(s => s && s.lat && s.lng)} />
                    )}

                    {linePositions.length > 0 && (
                        <Polyline positions={linePositions} color="#3b82f6" weight={4} opacity={0.7} dashArray="5, 10" />
                    )}

                    {Array.isArray(stops) && stops.map((stop, idx) => stop && stop.lat && stop.lng && (
                        <Marker
                            key={stop.id}
                            position={[stop.lat, stop.lng]}
                            icon={L.divIcon({
                                className: 'custom-pin',
                                html: `<div style="background-color: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white;">${idx + 1}</div>`
                            })}
                        >
                            <Popup>
                                <div className="text-black">
                                    <strong>{idx + 1}. {stop.customer_name}</strong><br />
                                    {stop.address_text}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}
