import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, Alert } from 'react-native';
import { Truck, Settings } from 'lucide-react-native';
import useAuthStore from '../stores/authStore';
import { getApiUrl, setApiUrl } from '../services/api';

export default function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login, loading, error } = useAuthStore();

    // Server Config State
    const [showSettings, setShowSettings] = useState(false);
    const [serverUrl, setServerUrl] = useState('');

    useEffect(() => {
        loadUrl();
    }, []);

    const loadUrl = async () => {
        const url = await getApiUrl();
        setServerUrl(url);
    };

    const handleLogin = () => {
        if (username && password) {
            login(username, password);
        }
    };

    const handleSaveUrl = async () => {
        if (!serverUrl) return;
        try {
            await setApiUrl(serverUrl);
            setShowSettings(false);
            Alert.alert('Éxito', 'URL del servidor actualizada');
        } catch (e) {
            Alert.alert('Error', 'No se pudo guardar la URL');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => setShowSettings(true)}
                >
                    <Settings color="#666" size={24} />
                </TouchableOpacity>

                <View style={styles.iconContainer}>
                    <Truck size={48} color="#8b5cf6" />
                </View>
                <Text style={styles.title}>Logística AI</Text>
                <Text style={styles.subtitle}>App Conductores</Text>
            </View>

            <View style={styles.form}>
                {error && <Text style={styles.error}>{error}</Text>}

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Usuario</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej. chofer1"
                        placeholderTextColor="#666"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Contraseña</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••"
                        placeholderTextColor="#666"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Iniciar Sesión</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Server Config Modal */}
            <Modal
                visible={showSettings}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowSettings(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Configurar Servidor</Text>
                        <Text style={styles.modalLabel}>URL del API</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={serverUrl}
                            onChangeText={setServerUrl}
                            placeholder="http://192.168.1.10:3001/v1"
                            placeholderTextColor="#666"
                            autoCapitalize="none"
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowSettings(false)}
                            >
                                <Text style={styles.buttonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleSaveUrl}
                            >
                                <Text style={styles.buttonText}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f13', // Dark 900
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
        position: 'relative'
    },
    settingsButton: {
        position: 'absolute',
        top: -40,
        right: 0,
        padding: 10
    },
    iconContainer: {
        backgroundColor: 'rgba(139, 92, 246, 0.2)', // Primary 500 / 20
        padding: 16,
        borderRadius: 20,
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    subtitle: {
        fontSize: 16,
        color: '#a78bfa', // Primary 400
    },
    form: {
        gap: 16,
    },
    inputContainer: {
        gap: 8,
    },
    label: {
        color: '#ccc',
        fontSize: 14,
    },
    input: {
        backgroundColor: '#18181b', // Dark 800
        borderWidth: 1,
        borderColor: '#27272a', // Dark 700
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 16,
    },
    button: {
        backgroundColor: '#8b5cf6', // Primary 500
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    error: {
        color: '#ef4444',
        textAlign: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 12,
        borderRadius: 8,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: 24
    },
    modalContent: {
        backgroundColor: '#18181b',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: '#27272a'
    },
    modalTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center'
    },
    modalLabel: {
        color: '#ccc',
        marginBottom: 8
    },
    modalInput: {
        backgroundColor: '#0f0f13',
        borderWidth: 1,
        borderColor: '#27272a',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 16,
        marginBottom: 24
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12
    },
    modalButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center'
    },
    cancelButton: {
        backgroundColor: '#27272a'
    },
    saveButton: {
        backgroundColor: '#8b5cf6'
    }
});
