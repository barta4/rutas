import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Building, MapPin, Save, Plus, Trash2, Edit2, X } from 'lucide-react';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('company');

    // Config injected by api interceptor

    // Company State
    const [companyName, setCompanyName] = useState('');
    const [companyLoading, setCompanyLoading] = useState(false);

    // Depots State
    const [depots, setDepots] = useState([]);
    const [depotModal, setDepotModal] = useState(false);
    const [currentDepot, setCurrentDepot] = useState(null); // For editing
    const [depotForm, setDepotForm] = useState({ name: '', address_text: '', lat: '', lng: '' });

    useEffect(() => {
        if (activeTab === 'company') fetchCompany();
        if (activeTab === 'depots') fetchDepots();
    }, [activeTab]);

    // --- Company Functions ---
    const fetchCompany = async () => {
        try {
            const res = await api.get('/company');
            setCompanyName(res.data.name || '');
        } catch (e) {
            console.error(e);
        }
    };

    const saveCompany = async () => {
        setCompanyLoading(true);
        try {
            await api.put('/company', { name: companyName });
            // Show toast or alert
            alert('Configuración guardada');
        } catch (e) {
            console.error(e);
            alert('Error al guardar');
        } finally {
            setCompanyLoading(false);
        }
    };

    // --- Depots Functions ---
    const fetchDepots = async () => {
        try {
            const res = await api.get('/depots');
            setDepots(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleEditDepot = (depot) => {
        setCurrentDepot(depot);
        setDepotForm({
            name: depot.name,
            address_text: depot.address_text || '',
            lat: depot.lat || '',
            lng: depot.lng || ''
        });
        setDepotModal(true);
    };

    const handleNewDepot = () => {
        setCurrentDepot(null);
        setDepotForm({ name: '', address_text: '', lat: '', lng: '' });
        setDepotModal(true);
    };

    const saveDepot = async () => {
        try {
            if (currentDepot) {
                await api.put(`/depots/${currentDepot.id}`, depotForm);
            } else {
                await api.post('/depots', depotForm);
            }
            setDepotModal(false);
            fetchDepots();
        } catch (e) {
            console.error(e);
            alert('Error al guardar depósito');
        }
    };

    const deleteDepot = async (id) => {
        if (!confirm('¿Eliminar depósito?')) return;
        try {
            await api.delete(`/depots/${id}`);
            fetchDepots();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="p-6 h-full overflow-auto">
            <h1 className="text-2xl font-bold text-white mb-6">Configuración</h1>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-white/10 mb-6">
                <button
                    onClick={() => setActiveTab('company')}
                    className={`pb-2 px-4 text-sm font-medium transition-colors ${activeTab === 'company' ? 'border-b-2 border-primary-500 text-primary-400' : 'text-gray-400 hover:text-white'}`}
                >
                    Empresa
                </button>
                <button
                    onClick={() => setActiveTab('depots')}
                    className={`pb-2 px-4 text-sm font-medium transition-colors ${activeTab === 'depots' ? 'border-b-2 border-primary-500 text-primary-400' : 'text-gray-400 hover:text-white'}`}
                >
                    Depósitos
                </button>
            </div>

            {/* Company Settings */}
            {activeTab === 'company' && (
                <div className="max-w-xl">
                    <div className="bg-dark-800 p-6 rounded-xl border border-white/10">
                        <div className="mb-4">
                            <label className="block text-gray-400 text-sm mb-2">Nombre de la Empresa</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={e => setCompanyName(e.target.value)}
                                className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-primary-500"
                            />
                        </div>
                        <button
                            onClick={saveCompany}
                            disabled={companyLoading}
                            className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                        >
                            <Save size={18} /> {companyLoading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </div>
            )}

            {/* Depots Settings */}
            {activeTab === 'depots' && (
                <div>
                    <div className="flex justify-end mb-4">
                        <button onClick={handleNewDepot} className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                            <Plus size={18} /> Nuevo Depósito
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {depots.map(depot => (
                            <div key={depot.id} className="bg-dark-800 p-4 rounded-xl border border-white/10 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                        <Building size={18} className="text-primary-400" /> {depot.name}
                                    </h3>
                                    <p className="text-gray-400 text-sm mb-2 flex items-start gap-2">
                                        <MapPin size={14} className="mt-1 shrink-0" /> {depot.address_text || 'Sin dirección'}
                                    </p>
                                    <p className="text-xs text-gray-500 font-mono">
                                        {depot.lat ? `${depot.lat.toFixed(4)}, ${depot.lng.toFixed(4)}` : 'Sin coordenadas'}
                                    </p>
                                </div>
                                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-white/5">
                                    <button onClick={() => handleEditDepot(depot)} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => deleteDepot(depot.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Depot Modal */}
            {depotModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">{currentDepot ? 'Editar Depósito' : 'Nuevo Depósito'}</h2>
                            <button onClick={() => setDepotModal(false)}><X className="text-gray-400 hover:text-white" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-xs uppercase mb-1">Nombre</label>
                                <input
                                    className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-primary-500"
                                    value={depotForm.name}
                                    onChange={e => setDepotForm({ ...depotForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-xs uppercase mb-1">Dirección</label>
                                <input
                                    className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-primary-500"
                                    value={depotForm.address_text}
                                    onChange={e => setDepotForm({ ...depotForm, address_text: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-400 text-xs uppercase mb-1">Latitud</label>
                                    <input
                                        className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-primary-500"
                                        value={depotForm.lat}
                                        onChange={e => setDepotForm({ ...depotForm, lat: e.target.value })}
                                        placeholder="-34.90"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-xs uppercase mb-1">Longitud</label>
                                    <input
                                        className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-primary-500"
                                        value={depotForm.lng}
                                        onChange={e => setDepotForm({ ...depotForm, lng: e.target.value })}
                                        placeholder="-56.16"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={saveDepot}
                            className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 rounded-lg mt-6 transition-colors"
                        >
                            Guardar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
