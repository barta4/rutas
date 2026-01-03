import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Trash2, Plus, Zap, CheckCircle, AlertCircle } from 'lucide-react';

const Webhooks = () => {
    const [webhooks, setWebhooks] = useState([]);
    const [url, setUrl] = useState('');
    const [eventType, setEventType] = useState('order.updated');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchWebhooks();
    }, []);

    const fetchWebhooks = async () => {
        try {
            const res = await api.get('/webhooks');
            setWebhooks(res.data);
        } catch (err) {
            console.error('Error cargando webhooks', err);
        }
    };

    const handleAddWebhook = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post('/webhooks', { url, event_type: eventType });
            setUrl('');
            fetchWebhooks();
        } catch (err) {
            setError('Error al agregar el webhook. Verifica la URL.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este webhook?')) return;
        try {
            await api.delete(`/webhooks/${id}`);
            fetchWebhooks();
        } catch (err) {
            console.error('Error eliminando webhook', err);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <Zap className="text-primary-400" /> Webhooks & Integraciones
            </h2>

            {/* Formulario */}
            <div className="bg-dark-800 border border-white/10 p-6 rounded-2xl shadow-xl mb-8">
                <h3 className="text-xl font-semibold text-white mb-4">Agregar Nuevo Webhook</h3>
                <form onSubmit={handleAddWebhook} className="flex gap-4 flex-wrap">
                    <div className="flex-1 min-w-[300px]">
                        <label className="text-gray-400 text-sm mb-1 block">Endpoint URL</label>
                        <input
                            type="url"
                            placeholder="https://tu-api.com/webhook"
                            className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary-500 outline-none"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            required
                        />
                    </div>
                    <div className="w-[200px]">
                        <label className="text-gray-400 text-sm mb-1 block">Evento</label>
                        <select
                            className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 text-white outline-none"
                            value={eventType}
                            onChange={(e) => setEventType(e.target.value)}
                        >
                            <option value="order.updated">Pedido Actualizado</option>
                            <option value="order.completed">Pedido Completado</option>
                            <option value="driver.alert">Alerta Conductor</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-primary-500 hover:bg-primary-400 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                        >
                            {loading ? 'Guardando...' : <><Plus size={20} /> Agregar</>}
                        </button>
                    </div>
                </form>
                {error && <p className="text-red-400 mt-3 text-sm flex items-center gap-2"><AlertCircle size={16} /> {error}</p>}
            </div>

            {/* Lista */}
            <h3 className="text-xl font-semibold text-white mb-4">Webhooks Activos</h3>
            {webhooks.length === 0 ? (
                <div className="text-center py-12 bg-dark-800/50 rounded-2xl border border-white/5 border-dashed">
                    <Zap className="mx-auto text-gray-600 mb-3" size={48} />
                    <p className="text-gray-500">No tienes webhooks configurados aún.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {webhooks.map((webhook) => (
                        <div key={webhook.id} className="bg-dark-800 p-4 rounded-xl border border-white/10 flex justify-between items-center hover:border-primary-500/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-500/10 rounded-full text-green-400">
                                    <CheckCircle size={20} />
                                </div>
                                <div>
                                    <p className="font-mono text-sm text-gray-300">{webhook.url}</p>
                                    <span className="text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-full border border-primary-500/20">
                                        {webhook.event_type}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(webhook.id)}
                                className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                                title="Eliminar Webhook"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Webhooks;
