import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

const useAuthStore = create((set) => ({
    token: null,
    driver: null,
    loading: false,
    error: null,

    loadSession: async () => {
        try {
            const token = await SecureStore.getItemAsync('token');
            const driver = JSON.parse(await SecureStore.getItemAsync('driver') || 'null');
            if (token && driver) {
                set({ token, driver });
            }
        } catch (e) {
            console.error('Error loading session', e);
        }
    },

    login: async (username, password) => {
        set({ loading: true, error: null });
        try {
            // NOTE: Update backend logic to support /v1/driver/auth/login
            const response = await api.post('/driver/auth/login', { username, password });
            const { token, driver } = response.data;

            await SecureStore.setItemAsync('token', token);
            await SecureStore.setItemAsync('driver', JSON.stringify(driver));

            set({ token, driver, loading: false });
        } catch (e) {
            console.error(e);
            set({
                error: e.response?.data?.error || 'Error de conexión',
                loading: false
            });
        }
    },

    logout: async () => {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('driver');
        set({ token: null, driver: null });
    },
}));

export default useAuthStore;
