import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Package, Search, MapPin, CheckCircle, Clock, FileText, X, Image as ImageIcon, Users, Truck, LayoutTemplate, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Orders() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null); // For POD Modal
    const [editingOrder, setEditingOrder] = useState(null); // For Edit Modal
    const [drivers, setDrivers] = useState([]);
    const [assignModal, setAssignModal] = useState(null); // Order to assign
    const [loadingSheetModal, setLoadingSheetModal] = useState(false);
    const [loadingSheetData, setLoadingSheetData] = useState([]);
    const [loadingSheetDriverName, setLoadingSheetDriverName] = useState('');

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



    const handleDeleteOrder = async (id) => {
        if (!confirm('¿Seguro que deseas eliminar este pedido?')) return;
        try {
            await api.delete(`/orders/${id}`);
            fetchOrders();
        } catch (e) {
            console.error(e);
            alert('Error eliminando pedido');
        }
    };

    const handleUpdateOrder = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/orders/${editingOrder.id}`, editingOrder);
            setEditingOrder(null);
            fetchOrders();
        } catch (err) {
            alert('Error actualizando pedido');
        }
    };

    const handleGeocode = async () => {
        if (!editingOrder.address_text) return alert('Ingresa una dirección primero');
        try {
            const res = await api.post('/orders/geocode', { address: editingOrder.address_text });
            setEditingOrder({
                ...editingOrder,
                lat: res.data.coordinates.lat,
                lng: res.data.coordinates.lng,
                address_text: res.data.formatted_address // Update with full address
            });
            alert('¡Coordenadas encontradas!');
        } catch (e) {
            console.error(e);
            alert('No se encontraron coordenadas para esa dirección');
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

    const handleOpenLoadingSheet = async (driverId, driverName) => {
        setLoadingSheetModal(true);
        setLoadingSheetDriverName(driverName);
        setLoadingSheetData([]); // clear previous
        try {
            const res = await api.get(`/orders/loading-sheet?driver_id=${driverId}`);
            setLoadingSheetData(res.data);
        } catch (e) {
            console.error(e);
            alert('Error cargando hoja de carga');
            setLoadingSheetModal(false);
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

    const [createModal, setCreateModal] = useState(false);
    const [newOrder, setNewOrder] = useState({});

    const handleCreateOrder = async (e) => {
        e.preventDefault();
        try {
            await api.post('/orders', newOrder);
            setCreateModal(false);
            setNewOrder({});
            fetchOrders();
        } catch (e) {
            console.error(e);
            alert('Error creando pedido');
        }
    };

    return (
        <div className="p-6 h-full overflow-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">Gestión de Pedidos</h1>
                <div className="flex gap-4">
                    <button
                        onClick={() => setCreateModal(true)}
                        className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-primary-900/20"
                    >
                        <Package size={20} /> Nueva Orden
                    </button>
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
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => navigate(`/dashboard/simulator/${order.driver_id}`)}
                                                    className="hover:underline hover:text-blue-400 text-left"
                                                    title="Ver Ruta Simulada"
                                                >
                                                    {order.driver_name}
                                                </button>
                                                <button
                                                    onClick={() => handleOpenLoadingSheet(order.driver_id, order.driver_name)}
                                                    className="text-gray-500 hover:text-white"
                                                    title="Ver Hoja de Carga (LIFO)"
                                                >
                                                    <LayoutTemplate size={14} />
                                                </button>
                                            </div>
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
                                    <button
                                        onClick={() => setEditingOrder(order)}
                                        className="text-white hover:text-blue-400 p-1 bg-white/5 hover:bg-white/10 rounded"
                                        title="Editar"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteOrder(order.id)}
                                        className="text-white hover:text-red-400 p-1 bg-white/5 hover:bg-white/10 rounded"
                                        title="Eliminar"
                                    >
                                        <X size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Order Modal */}
            {createModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 rounded-xl p-6 w-full max-w-lg border border-white/10 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Package className="text-primary-400" /> Nueva Orden Manual
                            </h3>
                            <button onClick={() => setCreateModal(false)}><X className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleCreateOrder} className="space-y-4">
                            <div>
                                <label className="text-gray-400 text-xs uppercase font-bold">Cliente</label>
                                <input
                                    className="w-full bg-dark-900 border border-white/10 rounded p-3 text-white focus:border-primary-500 outline-none"
                                    placeholder="Nombre del Cliente"
                                    required
                                    value={newOrder.customer_name || ''}
                                    onChange={e => setNewOrder({ ...newOrder, customer_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs uppercase font-bold">Dirección</label>
                                <input
                                    className="w-full bg-dark-900 border border-white/10 rounded p-3 text-white focus:border-primary-500 outline-none"
                                    placeholder="Ej. Av. 18 de Julio 1234, Montevideo"
                                    required
                                    value={newOrder.address_text || ''}
                                    onChange={e => setNewOrder({ ...newOrder, address_text: e.target.value })}
                                />
                                <div className="text-xs text-blue-400 mt-1">ℹ️ Se geocodificará automáticamente</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-gray-400 text-xs uppercase font-bold">Teléfono (Opcional)</label>
                                    <input
                                        className="w-full bg-dark-900 border border-white/10 rounded p-3 text-white focus:border-primary-500 outline-none"
                                        placeholder="099 123 456"
                                        value={newOrder.customer_phone || ''}
                                        onChange={e => setNewOrder({ ...newOrder, customer_phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs uppercase font-bold">Cédula / ID (Opcional)</label>
                                    <input
                                        className="w-full bg-dark-900 border border-white/10 rounded p-3 text-white focus:border-primary-500 outline-none"
                                        placeholder="1.234.567-8"
                                        value={newOrder.customer_cedula || ''}
                                        onChange={e => setNewOrder({ ...newOrder, customer_cedula: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-primary-500/25 transition-all mt-4">
                                Crear Orden
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Loading Sheet Modal */}
            {loadingSheetModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 rounded-xl p-6 w-full max-w-2xl border border-white/10 shadow-2xl h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <LayoutTemplate className="text-primary-400" /> Hoja de Carga (LIFO)
                                </h3>
                                <p className="text-gray-400 text-sm">Cargar el camión en este orden (de arriba a abajo) para: <strong className="text-white">{loadingSheetDriverName}</strong></p>
                            </div>
                            <button onClick={() => setLoadingSheetModal(false)}><X className="text-gray-400 hover:text-white" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2">
                            {loadingSheetData.length === 0 ? (
                                <div className="text-center text-gray-500 py-12">No hay órdenes pendientes para esta ruta o no está secuenciada.</div>
                            ) : (
                                <div className="space-y-3">
                                    {loadingSheetData.map((item, index) => (
                                        <div key={index} className="bg-dark-900 p-4 rounded-lg border border-white/5 flex gap-4 items-center">
                                            <div className="bg-primary-500/20 text-primary-400 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">POSICIÓN EN CAMIÓN: FONDO {index === 0 && '(PRIMERO EN ENTRAR)'}</div>
                                                <div className="text-white font-medium text-lg">{item.customer_name}</div>
                                                <div className="text-gray-400">{item.address_text}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300">Seq. Entrega: #{item.delivery_sequence}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                            <button onClick={() => window.print()} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded flex items-center gap-2">
                                <FileText size={16} /> Imprimir
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                                {selectedOrder.proof_of_delivery.photos.map((url, i) => {
                                                    // Ensure we use the proxied path /v1/uploads instead of root /uploads
                                                    // Backend saves as /uploads/name.jpg. We strip /uploads/ and append to /v1/uploads/
                                                    const filename = url.split('/').pop();
                                                    /* Use api.defaults.baseURL if available or hardcode /v1 relative path for prod */
                                                    const src = import.meta.env.PROD
                                                        ? `/v1/uploads/${filename}`
                                                        : `http://localhost:3001/v1/uploads/${filename}`;

                                                    return (
                                                        <img
                                                            key={i}
                                                            src={src}
                                                            className="w-full rounded-lg border border-white/10"
                                                            alt="Prueba de entrega"
                                                        />
                                                    );
                                                })}
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

            {/* Edit Modal */}
            {editingOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 rounded-xl p-6 w-full max-w-lg border border-white/10 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Editar Pedido</h3>
                            <button onClick={() => setEditingOrder(null)}><X className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleUpdateOrder} className="space-y-4">
                            <div>
                                <label className="text-gray-400 text-xs uppercase">Cliente</label>
                                <input
                                    className="w-full bg-dark-900 border border-white/10 rounded p-2 text-white"
                                    value={editingOrder.customer_name || ''}
                                    onChange={e => setEditingOrder({ ...editingOrder, customer_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs uppercase">Dirección</label>
                                <div className="flex gap-2">
                                    <input
                                        className="w-full bg-dark-900 border border-white/10 rounded p-2 text-white"
                                        value={editingOrder.address_text || ''}
                                        onChange={e => setEditingOrder({ ...editingOrder, address_text: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGeocode}
                                        className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded"
                                        title="Buscar Coordenadas"
                                    >
                                        <MapPin size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-gray-400 text-xs uppercase">Teléfono</label>
                                    <input
                                        className="w-full bg-dark-900 border border-white/10 rounded p-2 text-white"
                                        value={editingOrder.customer_phone || ''}
                                        onChange={e => setEditingOrder({ ...editingOrder, customer_phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs uppercase">Estado</label>
                                    <select
                                        className="w-full bg-dark-900 border border-white/10 rounded p-2 text-white"
                                        value={editingOrder.status}
                                        onChange={e => setEditingOrder({ ...editingOrder, status: e.target.value })}
                                    >
                                        <option value="pending">Pendiente</option>
                                        <option value="in_progress">En Curso</option>
                                        <option value="completed">Completado</option>
                                        <option value="cancelled">Cancelado</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 bg-white/5 p-2 rounded border border-white/10">
                                <div>
                                    <label className="text-gray-400 text-xs uppercase">Latitud</label>
                                    <input
                                        type="number" step="any"
                                        className="w-full bg-dark-900 border border-white/10 rounded p-2 text-white font-mono text-sm"
                                        value={editingOrder.lat || ''}
                                        onChange={e => setEditingOrder({ ...editingOrder, lat: e.target.value })}
                                        placeholder="-34.90..."
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-xs uppercase">Longitud</label>
                                    <input
                                        type="number" step="any"
                                        className="w-full bg-dark-900 border border-white/10 rounded p-2 text-white font-mono text-sm"
                                        value={editingOrder.lng || ''}
                                        onChange={e => setEditingOrder({ ...editingOrder, lng: e.target.value })}
                                        placeholder="-56.16..."
                                    />
                                </div>
                                <div className="col-span-2 text-xs text-blue-300 flex items-center gap-1">
                                    ℹ️ Ingresa coordenadas para ver en el mapa.
                                </div>
                            </div>
                            <button className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-2 rounded mt-2">
                                Guardar Cambios
                            </button>
                        </form>
                    </div>
                </div>
            )}

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
