import axios from 'axios';

// Detect environment or use localhost fallback
// In Docker/Production, Nginx proxies /v1 to backend.
// In Dev (Vite), we utilize proxy or absolute path.
const isProd = import.meta.env.PROD;
const baseUrl = isProd ? '/v1' : 'http://localhost:3001/v1';

const api = axios.create({
    baseURL: baseUrl,
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = 'Bearer ' + token;
    }
    return config;
});

export default api;
