import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Truck } from 'lucide-react';

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await api.post('/auth/register', formData);

            // Auto-login
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));

            // Redirect
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Error al registrarse');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
            <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-md border border-zinc-800 shadow-2xl">
                <div className="flex justify-center mb-8">
                    <div className="bg-primary-600 p-3 rounded-xl">
                        <Truck size={32} className="text-white" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-center mb-2">Crear Cuenta Empresa</h1>
                <p className="text-gray-400 text-center mb-8 text-sm">Prueba gratis por 14 días. Sin tarjeta de crédito.</p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Empresa</label>
                        <input
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-primary-500 outline-none transition-colors"
                            placeholder="Ej. Logística Express"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Administrador</label>
                        <input
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-primary-500 outline-none transition-colors"
                            type="email"
                            placeholder="admin@empresa.com"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contraseña</label>
                        <input
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-primary-500 outline-none transition-colors"
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {loading ? 'Creando cuenta...' : 'Comenzar Prueba Gratis'}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-500">
                    ¿Ya tienes cuenta? <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Iniciar Sesión</Link>
                </div>
            </div>
        </div>
    );
}
