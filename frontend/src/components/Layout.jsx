import React, { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Activity, Truck, Package, Zap, LogOut, Settings, Code } from 'lucide-react';
import api from '../services/api';

const Layout = () => {
    const [user] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
    const [companyName, setCompanyName] = useState('Logística AI');

    React.useEffect(() => {
        api.get('/company').then(res => {
            if (res.data.name) setCompanyName(res.data.name);
        }).catch(err => console.error("Error fetching company info", err));
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    return (
        <div className="min-h-screen bg-dark-900 text-white flex flex-col">
            {/* Navbar */}
            <nav className="bg-dark-800 border-b border-white/10 p-4 flex justify-between items-center backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="bg-primary-500/20 p-2 rounded-lg">
                        <Truck className="text-primary-400" />
                    </div>
                    <h1 className="font-bold text-xl tracking-tight">{companyName}</h1>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-gray-400 text-sm hidden md:block">Hola, {user.name}</span>
                    <button
                        onClick={handleLogout}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-red-400"
                        title="Cerrar Sesión"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </nav>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 bg-dark-800 border-r border-white/10 hidden md:flex flex-col p-4 gap-2">
                    <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors focus:bg-white/10 focus:text-white">
                        <Activity size={20} /> Dashboard
                    </Link>
                    <Link to="/dashboard/orders" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors focus:bg-white/10 focus:text-white">
                        <Package size={20} /> Pedidos
                    </Link>
                    <Link to="/dashboard/drivers" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors focus:bg-white/10 focus:text-white">
                        <Truck size={20} /> Choferes
                    </Link>
                    <Link to="/dashboard/webhooks" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors focus:bg-white/10 focus:text-white">
                        <Zap size={20} /> Webhooks
                    </Link>
                    <Link to="/dashboard/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors focus:bg-white/10 focus:text-white">
                        <Settings size={20} /> Configuración
                    </Link>
                    <Link to="/dashboard/developers" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors focus:bg-white/10 focus:text-white mt-auto">
                        <Code size={20} /> Developers
                    </Link>
                </aside>

                {/* Content */}
                <main className="flex-1 overflow-auto bg-dark-900">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
