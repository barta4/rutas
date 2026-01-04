
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Package, MapPin, User, CheckCircle, Send } from 'lucide-react';

export default function ChatwootWidget() {
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [orderId, setOrderId] = useState(null);

    const [formData, setFormData] = useState({
        customer_name: '',
        address_text: '',
        completion_notes: ''
    });

    useEffect(() => {
        // Auto-fill from URL params (Chatwoot context)
        // URL format: /chatwoot-widget?name={{contact.name}}&email={{contact.email}}
        const name = searchParams.get('name') || '';
        const address = searchParams.get('address') || '';

        setFormData(prev => ({
            ...prev,
            customer_name: name,
            address_text: address
        }));
    }, [searchParams]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/orders', {
                ...formData,
                status: 'pending'
            });
            setOrderId(res.data.id);
            setSuccess(true);
        } catch (error) {
            console.error(error);
            alert('Error al crear el pedido. ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-green-500/20 p-4 rounded-full mb-4">
                    <CheckCircle size={48} className="text-green-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">¡Pedido Creado!</h2>
                <p className="text-gray-400 mb-6">El pedido se ha registrado correctamente en el sistema.</p>
                <button
                    onClick={() => { setSuccess(false); setFormData({ ...formData, completion_notes: '' }); }}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                    Nuevo Pedido
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-4">
            <div className="max-w-md mx-auto">
                <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-4">
                    <Package className="text-blue-500" size={24} />
                    <h1 className="text-lg font-bold">Nuevo Pedido FácilEnvíos</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs uppercase text-gray-500 font-bold mb-1 flex items-center gap-1">
                            <User size={12} /> Cliente
                        </label>
                        <input
                            name="customer_name"
                            value={formData.customer_name}
                            onChange={handleChange}
                            className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-lg p-3 text-white outline-none transition-colors"
                            placeholder="Nombre del cliente"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs uppercase text-gray-500 font-bold mb-1 flex items-center gap-1">
                            <MapPin size={12} /> Dirección
                        </label>
                        <input
                            name="address_text"
                            value={formData.address_text}
                            onChange={handleChange}
                            className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-lg p-3 text-white outline-none transition-colors"
                            placeholder="Ej: Av. Principal 123"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs uppercase text-gray-500 font-bold mb-1">
                            Detalles del Pedido (Items)
                        </label>
                        <textarea
                            name="completion_notes"
                            value={formData.completion_notes}
                            onChange={handleChange}
                            rows={4}
                            className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-lg p-3 text-white outline-none transition-colors resize-none"
                            placeholder="Ej: 2x Camisetas, 1x Gorra..."
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all mt-4"
                    >
                        {loading ? 'Creando...' : (
                            <>
                                <Send size={18} /> Crear Pedido
                            </>
                        )}
                    </button>
                </form>

                <p className="text-[10px] text-zinc-600 text-center mt-6">
                    Este widget está conectado a tu Dashboard de Logística.
                </p>
            </div>
        </div>
    );
}
