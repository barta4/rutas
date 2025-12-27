import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Package, Search, MapPin, CheckCircle, Clock, FileText, X, Image as ImageIcon, Users, Truck, LayoutTemplate } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Orders() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null); // For POD Modal
    const [editingOrder, setEditingOrder] = useState(null); // For Edit Modal
    const [drivers, setDrivers] = useState([]);
    const [assignModal, setAssignModal] = useState(null); // Order to assign

    // Token handled by api interceptor

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const [ordersRes, driversRes] = await Promise.all([
                api.get('/orders'),
                api.get('/drivers')
            ]);
            setOrders(ordersRes.data);
            setDrivers(driversRes.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignDriver = async (orderId, driverId) => {
        try {
            // We reuse updateOrder but only send driver_id
            await api.put(`/orders/${orderId}`, { driver_id: driverId });
            setAssignModal(null);
            fetchOrders();
        } catch (e) {
            console.error(e);
            alert('Error al asignar chofer');
        }
    };

    const StatusBadge = ({ status }) => {
        const styles = {
            completed: 'bg-green-500/20 text-green-400',
            pending: 'bg-yellow-500/20 text-yellow-400',
            in_progress: 'bg-blue-500/20 text-blue-400',
            cancelled: 'bg-red-500/20 text-red-400'
        };
        return (
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${styles[status] || 'bg-gray-500/20 text-gray-400'}`}>
                {status?.replace('_', ' ')}
            </span>
        );
    };

    return (
        <div className="p-6 h-full overflow-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">Gestión de Pedidos</h1>
                <div className="flex gap-4">
                    {/* Temporary entry point for simulation. In real app, maybe per-driver list */}
                    <div className="bg-dark-800 p-2 rounded-lg flex items-center gap-2 border border-white/10 w-64">
                        <Search size={18} className="text-gray-400" />
                        <input className="bg-transparent outline-none text-white text-sm w-full" placeholder="Buscar cliente..." />
                    </div>
                </div>
            </div>

            <div className="bg-dark-800 rounded-xl border border-white/10 overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="p-4">ID</th>
                            <th className="p-4">Cliente</th>
                            <th className="p-4">Dirección</th>
                            <th className="p-4">Chofer</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {orders.map(order => (
                            <tr key={order.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 text-gray-400 font-mono text-xs">#{order.id.slice(0, 8)}...</td>
                                <td className="p-4 font-medium text-white">
                                    {order.customer_name}
                                    <div className="text-xs text-gray-500">{order.customer_phone}</div>
                                    <div className="text-xs text-gray-600">CI: {order.customer_cedula || '-'}</div>
                                </td>
                                <td className="p-4 text-gray-300 text-sm">
                                    {order.address_text}
                                    {order.depot_name && <div className="text-xs text-blue-400 mt-1">Dep: {order.depot_name}</div>}
                                </td>
                                <td className="p-4 text-gray-300 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Truck size={14} className={order.driver_name ? 'text-primary-400' : 'text-gray-600'} />
                                        {order.driver_name ? (
                                            <button
                                                onClick={() => navigate(`/dashboard/simulator/${order.driver_id}`)}
                                                className="hover:underline hover:text-blue-400 text-left"
                                                title="Ver Ruta Simulada"
                                            >
                                                {order.driver_name}
                                            </button>
                                        ) : <span className="text-gray-600 italic">Sin asignar</span>}
                                    </div>
                                </td>
                                <td className="p-4"><StatusBadge status={order.status} /></td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    {order.status === 'completed' && (
                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1 bg-primary-500/10 px-2 py-1 rounded transition-colors"
                                        >
                                            <FileText size={14} /> Prueba
                                        </button>

                                    )}
                                    <button
                                        onClick={() => setAssignModal(order)}
                                        className="text-white hover:text-primary-400 p-1 bg-white/5 hover:bg-white/10 rounded"
                                        title="Asignar Chofer"
                                    >
                                        <Users size={16} />
                                    </button>
                                    {/* Edit Button Placeholder */}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* POD Modal */}
            {
                selectedOrder && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-6">
                        <div className="bg-dark-800 rounded-2xl max-w-2xl w-full border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <CheckCircle className="text-green-400" /> Detalle de Entrega
                                </h2>
                                <button onClick={() => setSelectedOrder(null)}><X className="text-gray-400 hover:text-white" /></button>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-sm text-gray-400 uppercase tracking-wide mb-2">Nota del Chofer</h3>
                                        <div className="bg-dark-900 p-4 rounded-lg border border-white/5 text-gray-200">
                                            {selectedOrder.completion_notes || "Sin notas."}
                                        </div>

                                        {selectedOrder.distance_from_target > 150 && (
                                            <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg text-yellow-400 text-sm">
                                                ⚠️ Entregado a <strong>{selectedOrder.distance_from_target}m</strong> del destino.
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="text-sm text-gray-400 uppercase tracking-wide mb-2">Evidencia Fotográfica</h3>
                                        {selectedOrder.proof_of_delivery?.photos?.length > 0 ? (
                                            <div className="grid gap-2">
                                                {selectedOrder.proof_of_delivery.photos.map((url, i) => (
                                                    <img
                                                        key={i}
                                                        src={`http://localhost:3001${url}`}
                                                        className="w-full rounded-lg border border-white/10"
                                                        alt="Prueba de entrega"
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="h-40 bg-dark-900 rounded-lg flex items-center justify-center text-gray-500 flex-col gap-2">
                                                <ImageIcon size={32} />
                                                <span>Sin fotos</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Assign Modal */}
            {
                assignModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-dark-800 rounded-xl p-6 w-full max-w-sm border border-white/10 shadow-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-white">Asignar Orden #{assignModal.id.slice(0, 6)}</h3>
                                <button onClick={() => setAssignModal(null)}><X className="text-gray-400" /></button>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {drivers.map(driver => (
                                    <button
                                        key={driver.id}
                                        onClick={() => handleAssignDriver(assignModal.id, driver.id)}
                                        className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${assignModal.driver_id === driver.id ? 'bg-primary-500/20 border border-primary-500/50' : 'bg-dark-900 hover:bg-white/5'}`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${driver.active ? 'bg-green-500' : 'bg-gray-500'}`} />
                                        <span className="text-white font-medium">{driver.name}</span>
                                        {assignModal.driver_id === driver.id && <CheckCircle size={16} className="ml-auto text-primary-400" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
