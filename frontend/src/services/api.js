```javascript
import axios from 'axios';

// Detect environment or use localhost fallback
// In Docker/Production, Nginx proxies /v1 to backend.
// In Dev (Vite), we utilize proxy or absolute path.
// Setting it to '' allows relative calls like '/v1/resource'
const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

const api = axios.create({
    baseURL: `${ API_URL }/v1`,
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
