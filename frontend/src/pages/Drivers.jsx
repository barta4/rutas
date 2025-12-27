import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Truck, Plus, Edit, Trash, X } from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = 'http://localhost:3001/v1';

export default function Drivers() {
    const [drivers, setDrivers] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState(null);
    const [formData, setFormData] = useState({ name: '', username: '', password: '', vehicle: '' });

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    useEffect(() => {
        fetchDrivers();
    }, []);

    const fetchDrivers = async () => {
        try {
            const res = await axios.get(`${API_URL}/drivers`, config);
            setDrivers(res.data);
        } catch (e) { console.error(e); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingDriver) {
                await axios.put(`${API_URL}/drivers/${editingDriver.id}`, {
                    name: formData.name,
                    username: formData.username,
                    vehicle_info: formData.vehicle,
                    active: true,
                    password: formData.password || undefined // Only send if changing
                }, config);
            } else {
                await axios.post(`${API_URL}/drivers`, {
                    name: formData.name,
                    username: formData.username,
                    password: formData.password,
                    vehicle_info: formData.vehicle
                }, config);
            }
            fetchDrivers();
            closeModal();
        } catch (e) {
            alert('Error al guardar: ' + (e.response?.data?.error || e.message));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Seguro que deseas eliminar este chofer?')) return;
        try {
            await axios.delete(`${API_URL}/drivers/${id}`, config);
            fetchDrivers();
        } catch (e) { console.error(e); }
    };

    const openModal = (driver = null) => {
        setEditingDriver(driver);
        setFormData(driver ? {
            name: driver.name,
            username: driver.username,
            password: '',
            vehicle: driver.vehicle_info || ''
        } : { name: '', username: '', password: '', vehicle: '' });
        setModalOpen(true);
    };

    const closeModal = () => setModalOpen(false);

    return (
        <div className="p-6 h-full overflow-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Gestión de Choferes</h1>
                    <p className="text-gray-400">Administra tu flota y vehículos</p>
                </div>
                <button onClick={() => openModal()} className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                    <Plus size={20} /> Nuevo Chofer
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {drivers.map(driver => (
                    <motion.div key={driver.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-dark-800 border border-white/10 rounded-xl p-4 shadow-lg">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/5 p-3 rounded-lg"><Truck className="text-blue-400" /></div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{driver.name}</h3>
                                    <p className="text-gray-400 text-xs text-secondary-400">@{driver.username}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs ${driver.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {driver.active ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>

                        <div className="mb-4 bg-dark-900 rounded p-3">
                            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Vehículo</p>
                            <p className="text-white bg-clip-text font-mono">{driver.vehicle_info || 'Sin asignar'}</p>
                        </div>

                        <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                            <button onClick={() => openModal(driver)} className="flex-1 bg-white/5 hover:bg-white/10 py-2 rounded text-sm text-white transition-colors flex items-center justify-center gap-2">
                                <Edit size={14} /> Editar
                            </button>
                            <button onClick={() => handleDelete(driver.id)} className="flex-1 bg-red-500/10 hover:bg-red-500/20 py-2 rounded text-sm text-red-400 transition-colors flex items-center justify-center gap-2">
                                <Trash size={14} /> Eliminar
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {modalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 p-6 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">{editingDriver ? 'Editar Chofer' : 'Nuevo Chofer'}</h2>
                            <button onClick={closeModal}><X className="text-gray-400 hover:text-white" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400 block mb-1">Nombre Completo</label>
                                <input className="w-full bg-dark-900 border border-white/10 rounded p-2 text-white focus:border-primary-500 outline-none"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 block mb-1">Usuario (Login)</label>
                                <input className="w-full bg-dark-900 border border-white/10 rounded p-2 text-white focus:border-primary-500 outline-none"
                                    value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 block mb-1">Vehículo</label>
                                <input className="w-full bg-dark-900 border border-white/10 rounded p-2 text-white focus:border-primary-500 outline-none"
                                    value={formData.vehicle} onChange={e => setFormData({ ...formData, vehicle: e.target.value })} placeholder="Ej: Camión 5, AA123BB" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 block mb-1">Contraseña {editingDriver && '(Opcional)'}</label>
                                <input className="w-full bg-dark-900 border border-white/10 rounded p-2 text-white focus:border-primary-500 outline-none"
                                    type="password"
                                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!editingDriver} />
                            </div>
                            <button className="w-full bg-primary-600 hover:bg-primary-500 text-white py-3 rounded-lg font-bold shadow-lg shadow-primary-500/20 mt-4 transition-all">
                                Guardar Chofer
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
