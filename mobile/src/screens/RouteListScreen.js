import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Linking, RefreshControl, Alert, Modal, TextInput, Image } from 'react-native';
import { MapPin, Navigation, Package, CheckCircle, LogOut, Radio, Camera as CameraIcon, X, Phone, User } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import useAuthStore from '../stores/authStore';

const LOCATION_TASK_NAME = 'background-location-task';

// --- Background Task con fetch() ---
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error("Location Task Error:", error);
        return;
    }
    if (data) {
        const { locations } = data;
        const location = locations[0];

        try {
            const token = await SecureStore.getItemAsync('token');
            const driverStr = await SecureStore.getItemAsync('driver');
            const apiUrl = await SecureStore.getItemAsync('api_url') || 'http://10.0.2.2:3001/v1';

            if (!token || !driverStr) {
                console.warn("Background: Missing token or driver data");
                return;
            }

            const driver = JSON.parse(driverStr);
            if (!driver?.id) {
                console.warn("Background: Invalid driver data");
                return;
            }

            console.log(`Sending telemetry for driver ${driver.id}`);

            // Usar XMLHttpRequest en lugar de fetch() para mayor compatibilidad en background
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${apiUrl}/telemetry`);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.setRequestHeader('Content-Type', 'application/json');

            xhr.onload = function () {
                if (xhr.status === 200) {
                    console.log("✓ Telemetry sent successfully");
                } else {
                    console.error("Telemetry failed:", xhr.status, xhr.responseText);
                }
            };

            xhr.onerror = function () {
                console.error("Network error sending telemetry");
            };

            xhr.send(JSON.stringify({
                driver_id: driver.id,
                lat: location.coords.latitude,
                lng: location.coords.longitude,
                timestamp: new Date(location.timestamp).toISOString()
            }));
        } catch (e) {
            console.error("Background Task Exception:", e);
        }
    }
});

function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d * 1000;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

export default function RouteListScreen() {
    const { driver, logout } = useAuthStore();
    const [route, setRoute] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isTracking, setIsTracking] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [note, setNote] = useState('');
    const [photo, setPhoto] = useState(null);
    const [distance, setDistance] = useState(0);
    const [isFar, setIsFar] = useState(false);

    const fetchRoute = async () => {
        setLoading(true);
        try {
            const res = await api.get('/driver/route');
            setRoute(res.data.route);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoute();
        startAutomaticTracking();
    }, []);

    const startAutomaticTracking = async () => {
        try {
            // 1. Primero foreground
            const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();

            if (fgStatus !== 'granted') {
                Alert.alert('Permiso Requerido', 'Se requiere ubicación en primer plano');
                return;
            }

            // 2. Luego background (crítico en Android 14+)
            const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();

            if (bgStatus !== 'granted') {
                Alert.alert(
                    'Ubicación en segundo plano',
                    'Para enviar tu ubicación constantemente, debes permitir "Permitir todo el tiempo" en los ajustes de ubicación.',
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Abrir ajustes', onPress: () => Linking.openSettings() }
                    ]
                );
                return;
            }

            const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
            if (!hasStarted) {
                await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                    accuracy: Location.Accuracy.Balanced,
                    distanceInterval: 10,
                    timeInterval: 30000,
                    deferredUpdatesInterval: 30000,
                    foregroundService: {
                        notificationTitle: "GliUY Logística",
                        notificationBody: "Compartiendo ubicación en segundo plano...",
                        notificationColor: "#8b5cf6"
                    },
                });
            }
            setIsTracking(true);
        } catch (e) {
            console.error('Tracking Error:', e);
            Alert.alert('Error', 'No se pudo iniciar el tracking: ' + e.message);
        }
    };

    const handleCompletePress = async (item) => {
        setSelectedOrder(item);
        setNote('');
        setPhoto(null);

        let loc = await Location.getCurrentPositionAsync({});
        const dist = getDistanceFromLatLonInM(
            loc.coords.latitude, loc.coords.longitude,
            item.lat, item.lng
        );

        setDistance(dist);
        setIsFar(dist > 150);

        setModalVisible(true);
    };

    const takePhoto = async () => {
        try {
            // 1. Capture (Fastest possible, no editing)
            let result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false, // SKIP NATIVE EDITING UI for speed
                quality: 0.5,
            });

            if (!result.canceled && result.assets[0]) {
                // 2. Compress & Resize (The secret sauce)
                const Manipulator = require('expo-image-manipulator');
                const manipResult = await Manipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 800 } }], // Resize to 800px width (plenty for POD)
                    { compress: 0.4, format: Manipulator.SaveFormat.JPEG }
                );

                setPhoto(manipResult);
            }
        } catch (e) {
            console.error("Camera Error:", e);
            Alert.alert("Error", "No se pudo tomar la foto.");
        }
    };

    const submitCompletion = async () => {
        if (isFar && !note) {
            Alert.alert("Motivo Requerido", `Estás a ${Math.round(distance)}m del destino. Debes indicar por qué completas aquí.`);
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('status', 'completed');

            const loc = await Location.getCurrentPositionAsync({});
            const proofData = {
                note: note,
                distance_from_target: Math.round(distance),
                coordinates: {
                    lat: loc.coords.latitude,
                    lng: loc.coords.longitude
                }
            };
            formData.append('proof_data_json', JSON.stringify(proofData));

            if (photo) {
                let filename = photo.uri.split('/').pop();
                let match = /\.(\w+)$/.exec(filename);
                let type = match ? `image/${match[1]}` : `image`;

                formData.append('photo', {
                    uri: photo.uri,
                    name: filename,
                    type: type,
                });
            }

            await api.post(`/driver/orders/${selectedOrder.id}/status`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setModalVisible(false);
            Alert.alert("Éxito", "Orden completada correctamente.");
            fetchRoute();

        } catch (e) {
            console.error("Upload Error:", e);
            const serverMsg = e.response?.data?.error || e.message;
            Alert.alert("Error Upload", `Fallo al subir: ${serverMsg} (${e.response?.status})`);
        } finally {
            setLoading(false);
        }
    };

    const pendingOrders = route.filter(o => o.status === 'pending');
    const nextActiveOrder = pendingOrders.length > 0 ? pendingOrders.reduce((prev, curr) => prev.delivery_sequence < curr.delivery_sequence ? prev : curr) : null;

    const handleCall = (phone) => {
        if (!phone) {
            Alert.alert("Sin número", "Este cliente no tiene teléfono registrado.");
            return;
        }
        Linking.openURL(`tel:${phone}`);
    };

    const [loadingAction, setLoadingAction] = useState(null); // { id, type }

    // ... existing tracking logic

    const handleStartOrder = async (item) => {
        if (item.status === 'in_progress') {
            Linking.openURL(`google.navigation:q=${item.lat},${item.lng}`);
            return;
        }

        setLoadingAction({ id: item.id, type: 'start' });
        try {
            let loc = null;
            try {
                const { coords } = await Location.getCurrentPositionAsync({});
                loc = coords;
            } catch (e) { console.warn("No loc"); }

            await api.post(`/driver/orders/${item.id}/start`, {
                lat: loc?.latitude,
                lng: loc?.longitude
            }).catch(err => console.error("API Start Warning:", err.message));

            const updated = route.map(r => r.id === item.id ? { ...r, status: 'in_progress' } : r);
            setRoute(updated);
            Linking.openURL(`google.navigation:q=${item.lat},${item.lng}`);

        } catch (e) {
            console.error("Critical Start Error", e);
            Linking.openURL(`google.navigation:q=${item.lat},${item.lng}`);
        } finally {
            setLoadingAction(null);
        }
    };

    const renderItem = ({ item }) => {
        // ... vars
        const isCompleted = item.status === 'completed';
        const isActive = nextActiveOrder && item.id === nextActiveOrder.id;
        const isPending = item.status === 'pending';
        const isDisabled = isPending && !isActive;

        const isStarting = loadingAction?.id === item.id && loadingAction?.type === 'start';

        return (
            // ... inside View
            // ... existing JSX
            <TouchableOpacity
                style={[styles.actionButton, styles.navButton, isDisabled && { backgroundColor: '#3f3f46' }]}
                onPress={() => handleStartOrder(item)}
                disabled={isDisabled || isStarting}
            >
                {isStarting ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Navigation size={18} color="#fff" />
                )}
                <Text style={styles.actionText}>
                    {isStarting ? 'Avisando...' : (isDisabled ? '...' : (item.status === 'in_progress' ? 'Retomar' : 'Ir'))}
                </Text>
            </TouchableOpacity>
            // ...
        );
    };

    // ... in Modal

    <TouchableOpacity
        style={styles.submitButton}
        onPress={submitCompletion}
        disabled={loading}
    >
        {loading && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />}
        <Text style={styles.submitText}>{loading ? 'Subiendo datos...' : 'Finalizar Orden'}</Text>
    </TouchableOpacity>
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f13' },
    modalView: {
        flex: 1,
        marginTop: 50,
        backgroundColor: '#18181b',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    warningBox: {
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eab308',
        marginBottom: 16,
    },
    warningText: { color: '#facc15', fontWeight: 'bold' },
    warningSubtext: { color: '#fde047', fontSize: 12 },
    label: { color: '#ccc', marginBottom: 8 },
    input: {
        backgroundColor: '#27272a',
        color: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    photoButton: {
        backgroundColor: '#27272a',
        height: 100,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#3f3f46',
        borderStyle: 'dashed'
    },
    photoButtonText: { color: '#a1a1aa', marginTop: 8 },
    photoContainer: { marginBottom: 24, alignItems: 'center' },
    photoPreview: { width: '100%', height: 200, borderRadius: 8 },
    retakeButton: { marginTop: 8 },
    retakeText: { color: '#a78bfa' },
    submitButton: {
        backgroundColor: '#10b981',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center'
    },
    submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, paddingTop: 60, backgroundColor: '#18181b' },
    greeting: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    list: { padding: 16 },
    card: { backgroundColor: '#18181b', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#27272a' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    badge: { backgroundColor: 'rgba(139, 92, 246, 0.1)', paddingHorizontal: 8, borderRadius: 8 },
    badgeText: { color: '#a78bfa', fontWeight: 'bold' },
    status: { fontSize: 12, fontWeight: 'bold' },
    infoRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
    customerName: { color: '#fff', fontWeight: '600' },
    address: { color: '#a1a1aa' },
    actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
    actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, gap: 8 },
    callButton: { backgroundColor: '#e11d48', flex: 0.3 },
    navButton: { backgroundColor: '#3b82f6' },
    completeButton: { backgroundColor: '#10b981' },
    actionText: { color: '#fff', fontWeight: 'bold' },
    detailText: { color: '#d1d5db', fontSize: 14 }
});
