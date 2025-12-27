import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// NOTE: Replace with your PC's local IP if testing on real device
// Emulator usually maps localhost:3000 to 10.0.2.2:3000
const DEFAULT_API_URL = 'http://192.168.1.17:3001/v1';

const api = axios.create({
    baseURL: DEFAULT_API_URL,
});

api.interceptors.request.use(async (config) => {
    const storedUrl = await SecureStore.getItemAsync('api_url');
    if (storedUrl) {
        config.baseURL = storedUrl;
    }

    const token = await SecureStore.getItemAsync('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const setApiUrl = async (url) => {
    await SecureStore.setItemAsync('api_url', url);
};

export const getApiUrl = async () => {
    return await SecureStore.getItemAsync('api_url') || DEFAULT_API_URL;
};

export default api;
