import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, Truck } from 'lucide-react';
import api from '../services/api';

const Login = () => {
    // Force Rebuild 2025-12-27 v2
    console.log('Login Component Loaded v2');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // Using the centralized api instance which handles base URL automatically
            const res = await api.post('/auth/login', { email, password });
            const { token, user } = res.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            navigate('/dashboard');
        } catch (err) {
            setError('Credenciales inválidas. Inténtalo de nuevo.');
        }
    };

    return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-500 rounded-full blur-[128px] opacity-20"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent-500 rounded-full blur-[128px] opacity-20"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-dark-800/50 backdrop-blur-xl p-8 rounded-2xl border border-white/10 w-full max-w-md shadow-2xl z-10"
            >
                <div className="flex justify-center mb-6">
                    <div className="p-3 bg-primary-500/20 rounded-full">
                        <Truck className="w-8 h-8 text-primary-400" />
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-center text-white mb-2">Bienvenido</h2>
                <p className="text-gray-400 text-center mb-8">Gestión Logística Inteligente</p>

                <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-gray-400 text-sm ml-1">Email Corporativo</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                            <input
                                type="email"
                                className="w-full bg-dark-900/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                placeholder="admin@empresa.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-gray-400 text-sm ml-1">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                            <input
                                type="password"
                                className="w-full bg-dark-900/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="w-full bg-gradient-to-r from-primary-500 to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-primary-500/25 transition-all"
                    >
                        Iniciar Sesión
                    </motion.button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-500 flex flex-col gap-2">
                    <div>
                        ¿No tienes cuenta? <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">Regístrate Gratis</Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
