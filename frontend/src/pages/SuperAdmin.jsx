import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Users, Truck, AlertTriangle, CheckCircle, Search, Shield, Calendar, Activity, UserPlus, Package, LogIn, Key } from 'lucide-react';

export default function SuperAdmin() {
    const [tenants, setTenants] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [tenantsRes, statsRes] = await Promise.all([
                api.get('/admin/tenants'),
                api.get('/admin/stats')
            ]);
            setTenants(tenantsRes.data);
            setStats(statsRes.data);
        } catch (e) {
            console.error(e);
            alert('Error cargando panel. Verifica permisos.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, currentStatus) => {
        if (!confirm(`¿Cambiar estado?`)) return;
        try {
            const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
            await api.put(`/admin/tenants/${id}`, { status: newStatus });
            fetchData();
        } catch (e) { alert('Error actualizando estado'); }
    };

    const handleExtendTrial = async (id) => {
        const days = prompt('¿Días a extender?', '14');
        if (!days) return;
        try {
            await api.put(`/admin/tenants/${id}`, { extend_trial_days: days });
            alert('Prueba extendida');
            fetchData();
        } catch (e) { alert('Error extendiendo prueba'); }
    };

    const handleUpdatePlan = async (id, planType) => {
        const plans = {
            'Free': { max_drivers: 5, max_orders: 100 },
            'Pro': { max_drivers: 20, max_orders: 1000 },
            'Enterprise': { max_drivers: 100, max_orders: 10000 }
        };
        const limits = plans[planType];
        if (!confirm(`¿Asignar plan ${planType}?`)) return;

        try {
            await api.put(`/admin/tenants/${id}`, limits);
            fetchData();
        } catch (e) { alert('Error actualizando plan'); }
    };

    const handleImpersonate = async (id) => {
        if (!confirm('¿Iniciar sesión como este usuario? (Saldrás de tu cuenta actual)')) return;
        try {
            const res = await api.post(`/admin/tenants/${id}/impersonate`);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            window.location.href = '/dashboard';
        } catch (e) { alert('Error iniciando sesión'); }
    };

    const handleResetPassword = async (id) => {
        const newPass = prompt('Ingresa la nueva contraseña (mínimo 6 caracteres):');
        if (!newPass) return;
        try {
            await api.post(`/admin/tenants/${id}/reset-password`, { new_password: newPass });
            alert('Contraseña actualizada correctamente.');
        } catch (e) { alert('Error al resetear contraseña'); }
    };

    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-white flex justify-center"><Activity className="animate-spin" size={32} /></div>;

    return (
        <div className="p-6 h-full overflow-auto bg-black min-h-screen">
            {/* Header & Stats */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mb-6">
                    Super Admin <span className="text-white text-lg font-normal opacity-50">v2.0</span>
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <StatCard icon={<Users />} title="Total Empresas" value={stats?.total_tenants} color="blue" />
                    <StatCard icon={<UserPlus />} title="Nuevas (30d)" value={stats?.new_tenants_month} color="green" />
                    <StatCard icon={<Package />} title="Total Órdenes" value={stats?.total_orders} color="purple" />
                    <StatCard icon={<Truck />} title="Drivers Activos" value={stats?.active_drivers} color="orange" />
                </div>

                <div className="bg-zinc-900 p-2 rounded-lg flex items-center gap-2 border border-zinc-800 max-w-md">
                    <Search size={18} className="text-gray-400" />
                    <input
                        className="bg-transparent outline-none text-white text-sm w-full"
                        placeholder="Buscar empresa por nombre, email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Tenants Table */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-950 text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="p-4">Empresa</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4">Plan Actual</th>
                            <th className="p-4">Acciones Rápidas</th>
                            <th className="p-4 text-right">Gestión</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {filteredTenants.map(tenant => (
                            <TenantRow
                                key={tenant.id}
                                tenant={tenant}
                                onUpdateStatus={handleUpdateStatus}
                                onExtendTrial={handleExtendTrial}
                                onUpdatePlan={handleUpdatePlan}
                                onImpersonate={handleImpersonate}
                                onResetPassword={handleResetPassword}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const StatCard = ({ icon, title, value, color }) => (
    <div className={`bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex items-center gap-4`}>
        <div className={`p-3 rounded-lg bg-${color}-500/10 text-${color}-500`}>
            {icon}
        </div>
        <div>
            <p className="text-gray-400 text-xs uppercase font-bold">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const TenantRow = ({ tenant, onUpdateStatus, onExtendTrial, onUpdatePlan, onImpersonate, onResetPassword }) => {
    const isTrialExpired = new Date() > new Date(tenant.trial_ends_at);
    const daysLeft = Math.ceil((new Date(tenant.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24));

    return (
        <tr className="hover:bg-zinc-800/50 transition-colors group">
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
                {!tenant.is_super_admin && (
                    <div className="text-[10px] mt-1 text-gray-500">
                        {isTrialExpired ? 'Prueba Finalizada' : `Prueba: ${daysLeft} días`}
                    </div>
                )}
            </td>
            <td className="p-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs text-gray-300">
                        <Users size={12} /> {tenant.max_drivers} Drivers
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-300">
                        <Package size={12} /> {tenant.max_orders} Órdenes
                    </div>

                    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {['Free', 'Pro', 'Enterprise'].map(plan => (
                            <button key={plan} onClick={() => onUpdatePlan(tenant.id, plan)} className="px-2 py-0.5 bg-zinc-700 hover:bg-white hover:text-black rounded text-[10px] transition-colors">
                                {plan}
                            </button>
                        ))}
                    </div>
                </div>
            </td>
            <td className="p-4">
                <div className="flex gap-2">
                    <button onClick={() => onImpersonate(tenant.id)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-medium transition-colors">
                        <LogIn size={14} /> Acceder
                    </button>
                    <button onClick={() => onResetPassword(tenant.id)} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 text-gray-400 hover:bg-zinc-700 rounded-lg text-xs font-medium transition-colors">
                        <Key size={14} /> Pass
                    </button>
                </div>
            </td>
            <td className="p-4 text-right flex justify-end gap-2">
                <button onClick={() => onExtendTrial(tenant.id)} className="p-2 hover:bg-zinc-700 rounded text-gray-400 hover:text-white" title="Extender Prueba">
                    <Calendar size={16} />
                </button>
                {!tenant.is_super_admin && (
                    <button onClick={() => onUpdateStatus(tenant.id, tenant.status)} className={`p-2 hover:bg-zinc-700 rounded ${tenant.status === 'active' ? 'text-green-400 hover:text-red-400' : 'text-red-400 hover:text-green-400'}`}>
                        {tenant.status === 'active' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                    </button>
                )}
            </td>
        </tr>
    );
};
