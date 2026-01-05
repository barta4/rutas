import React, { useEffect, useState } from 'react';
import { Copy, Code, Check } from 'lucide-react';

export default function ApiDocs() {
    const [user, setUser] = useState({});
    const [apiKey, setApiKey] = useState('************************');
    const [showKey, setShowKey] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(u);
        // We actually need to fetch the real API KEY from backend if we want to show it.
        // For security, usually we don't show it again, or we have a specific endpoint.
        // But in our create-tenant script we didn't save it in localstorage.
        // Let's assume for this Demo we show a placeholder or we need an endpoint to "Reveal Key".
        // Since we are simulating, let's just show a "Regenerate" flow or similar.
        // For now, I will display a simulated key if not available.
        setApiKey(u.api_key || 'a1b2c3d4e5f6...');
    }, []);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const codeExamples = {
        curl: `curl -X POST https://api.gliuy.com/v1/orders \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_name": "Juan Perez",
    "address_text": "Av 18 de Julio 1234",
    "city": "Montevideo",
    "neighborhood": "Centro",
    "customer_phone": "099123456"
  }'`,
        node: `const axios = require('axios');

await axios.post('https://api.gliuy.com/v1/orders', {
  customer_name: 'Juan Perez',
  address_text: 'Av 18 de Julio 1234',
  city: 'Montevideo',     // Opcional: Mejora precisión
  neighborhood: 'Centro', // Opcional: Mejora precisión
  customer_phone: '099123456'
}, {
  headers: { 'x-api-key': 'YOUR_API_KEY' }
});`,
        python: `import requests

requests.post('https://api.gliuy.com/v1/orders', 
    json={
        "customer_name": "Juan Perez",
        "address_text": "Av 18 de Julio 1234",
        "city": "Montevideo",
        "neighborhood": "Centro",
        "customer_phone": "099123456"
    },
    headers={"x-api-key": "YOUR_API_KEY"}
)`
    };

    return (
        <div className="p-6 h-full overflow-auto bg-black min-h-screen text-gray-300">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <div className="bg-blue-600/20 p-3 rounded-lg text-blue-400">
                        <Code size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Developer Hub</h1>
                        <p className="text-gray-400">Integra tu sistema con nuestra API REST</p>
                    </div>
                </div>

                {/* API Key Section */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8 shadow-lg">
                    <h2 className="text-lg font-bold text-white mb-4">Tu API Key</h2>
                    <div className="flex gap-4">
                        <div className="flex-1 bg-black rounded-lg border border-zinc-800 flex items-center px-4 font-mono text-sm text-green-400">
                            {showKey ? apiKey : '•'.repeat(40)}
                        </div>
                        <button
                            onClick={() => setShowKey(!showKey)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 rounded-lg font-medium transition-colors"
                        >
                            {showKey ? 'Ocultar' : 'Mostrar'}
                        </button>
                        <button
                            onClick={() => copyToClipboard(apiKey)}
                            className="bg-primary-600 hover:bg-primary-500 text-white px-4 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                            {copied ? 'Copiado' : 'Copiar'}
                        </button>
                    </div>
                    <div className="mt-4 text-xs text-yellow-500/80">
                        ⚠️ Mantén esta clave segura. No la compartas en el código frontend de tu sitio web.
                    </div>
                </div>

                {/* Documentation */}
                <div className="space-y-8">
                    <section>
                        <h3 className="text-xl font-bold text-white mb-4">Crear Pedido</h3>
                        <p className="mb-4">Endpoint: <code className="bg-zinc-800 px-2 py-1 rounded text-primary-400">POST /v1/orders</code></p>

                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                            <div className="flex border-b border-zinc-800">
                                <div className="px-4 py-2 bg-zinc-800/50 text-white text-sm font-medium border-r border-zinc-800">cURL</div>
                                <div className="px-4 py-2 hover:bg-zinc-800/50 text-gray-400 text-sm font-medium cursor-pointer">Node.js</div>
                                <div className="px-4 py-2 hover:bg-zinc-800/50 text-gray-400 text-sm font-medium cursor-pointer">Python</div>
                            </div>
                            <div className="p-4 bg-black overflow-x-auto">
                                <pre className="text-sm font-mono text-blue-300">
                                    {codeExamples.curl}
                                </pre>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xl font-bold text-white mb-4">Webhook (Notificaciones)</h3>
                        <p className="mb-4">
                            Configura una URL en la sección "Webhooks" para recibir eventos en tiempo real cuando cambia el estado de un pedido.
                        </p>
                        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                            <h4 className="text-sm font-bold text-white mb-2">Payload de Ejemplo (Evento: driver_approaching)</h4>
                            <pre className="text-xs font-mono text-gray-400">
                                {`{
  "event": "driver_approaching",
  "order_id": "12345",
  "eta_seconds": 120,
  "distance_meters": 450
}`}
                            </pre>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
