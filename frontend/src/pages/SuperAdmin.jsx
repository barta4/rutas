import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Users, Truck, AlertTriangle, CheckCircle, Search, Shield, Calendar } from 'lucide-react';

export default function SuperAdmin() {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            const res = await api.get('/admin/tenants');
            setTenants(res.data);
        } catch (e) {
            console.error(e);
            alert('Error cargando tenants. Verifica si eres Super Admin.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        if (!confirm(`¿Cambiar estado a ${newStatus}?`)) return;

        try {
            await api.put(`/admin/tenants/${id}`, { status: newStatus });
            fetchTenants();
        } catch (e) {
            alert('Error actualizando estado');
        }
    };

    const handleExtendTrial = async (id) => {
        const days = prompt('¿Cuántos días extender el período de prueba?', '14');
        if (!days) return;

        try {
            await api.put(`/admin/tenants/${id}`, { extend_trial_days: days });
            alert('Período de prueba extendido');
            fetchTenants();
        } catch (e) {
            alert('Error extendiendo prueba');
        }
    };

    const handleUpdateLimits = async (id, currentLimit) => {
        const newLimit = prompt('Nuevo límite de choferes:', currentLimit);
        if (!newLimit) return;

        try {
            await api.put(`/admin/tenants/${id}`, { max_drivers: parseInt(newLimit) });
            fetchTenants();
        } catch (e) {
            alert('Error actualizando límites');
        }
    };

    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-white">Cargando panel maestro...</div>;

    return (
        <div className="p-6 h-full overflow-auto bg-black min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mb-2">
                        Super Admin Panel
                    </h1>
                    <p className="text-gray-400">Gestión Global de Empresas (SaaS)</p>
                </div>

                <div className="bg-zinc-900 p-2 rounded-lg flex items-center gap-2 border border-zinc-800 w-96">
                    <Search size={18} className="text-gray-400" />
                    <input
                        className="bg-transparent outline-none text-white text-sm w-full"
                        placeholder="Buscar empresa por nombre o email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-950 text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="p-4">Empresa / Admin</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4">Plan / Límites</th>
                            <th className="p-4">Prueba (Trial)</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {filteredTenants.map(tenant => {
                            const isTrialExpired = new Date() > new Date(tenant.trial_ends_at);
                            const daysLeft = Math.ceil((new Date(tenant.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24));

                            return (
                                <tr key={tenant.id} className="hover:bg-zinc-800/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-zinc-800 rounded-lg">
                                                <Shield size={20} className={tenant.is_super_admin ? "text-red-500" : "text-blue-400"} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white flex items-center gap-2">
                                                    {tenant.name}
                                                    {tenant.is_super_admin && <span className="text-[10px] bg-red-500 text-white px-1 rounded">SUPER</span>}
                                                </div>
                                                <div className="text-xs text-gray-500">{tenant.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${tenant.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {tenant.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-4 text-sm text-gray-300">
                                            <div className="flex items-center gap-1" title="Límite de Choferes">
                                                <Users size={14} className="text-gray-500" />
                                                <span className="font-mono">{tenant.max_drivers}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm">
                                            {tenant.is_super_admin ? (
                                                <span className="text-gray-600 italic">Illimitado</span>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className={isTrialExpired ? "text-red-500" : "text-green-500"} />
                                                    <span className={isTrialExpired ? "text-red-400" : "text-gray-300"}>
                                                        {isTrialExpired ? 'Expirado' : `${daysLeft} días restantes`}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => handleUpdateLimits(tenant.id, tenant.max_drivers)}
                                            className="p-2 hover:bg-zinc-700 rounded text-gray-400 hover:text-white"
                                            title="Editar Límites"
                                        >
                                            <Truck size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleExtendTrial(tenant.id)}
                                            className="p-2 hover:bg-zinc-700 rounded text-gray-400 hover:text-white"
                                            title="Extender Prueba"
                                        >
                                            <Calendar size={16} />
                                        </button>
                                        {!tenant.is_super_admin && (
                                            <button
                                                onClick={() => handleUpdateStatus(tenant.id, tenant.status)}
                                                className={`p-2 hover:bg-zinc-700 rounded ${tenant.status === 'active' ? 'text-green-400 hover:text-red-400' : 'text-red-400 hover:text-green-400'}`}
                                                title={tenant.status === 'active' ? 'Suspender' : 'Activar'}
                                            >
                                                {tenant.status === 'active' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
