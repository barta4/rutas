import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Linking, RefreshControl, Alert, Modal, TextInput, Image, PermissionsAndroid, Platform, ActivityIndicator } from 'react-native';
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
    const [loadingAction, setLoadingAction] = useState(null); // { id: orderId, type: 'start' | 'complete' }

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
            // 0. (Android 13+) Request Notification Permission for Foreground Service
            if (Platform.OS === 'android' && Platform.Version >= 33) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    console.log("Notification permission denied");
                }
            }

            // 1. Primero foreground
            const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();

            if (fgStatus !== 'granted') {
                Alert.alert('Permiso Requerido', 'Se requiere ubicación en primer plano');
                return;
            }

            // 2. Background Permission (Optional validation)
            // WARNING: Requesting this automatically might switch the app to Settings on some Android versions, causing a loop.
            // We rely on Foreground Service (Notification) which works with "When in Use" permission for continuous tracking.

            /* 
            const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
            if (bgStatus !== 'granted') {
                // Don't force open settings automatically
                console.log("Background location not granted, proceeding with Foreground Service");
            }
            */

            const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
            if (!hasStarted) {
                await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                    accuracy: Location.Accuracy.Balanced, // REVERT: High accuracy might cause crashes on some devices
                    distanceInterval: 15, // Relaxed
                    timeInterval: 15000, // Relaxed to 15s
                    deferredUpdatesInterval: 15000,
                    foregroundService: {
                        notificationTitle: "GliUY Logística",
                        notificationBody: "Compartiendo ubicación...",
                        notificationColor: "#8b5cf6"
                    },
                });
            }
            setIsTracking(true);
        } catch (e) {
            console.error('Tracking Error:', e);
            // Non-blocking alert
            // Alert.alert('Error', 'No se pudo iniciar el tracking: ' + e.message);
        }
    };

    const handleCall = (phoneNumber) => {
        Linking.openURL(`tel:${phoneNumber}`);
    };

    const handleOpenModal = async (order) => {
        setSelectedOrder(order);
        setNote('');
        setPhoto(null);
        setIsFar(false);

        try {
            const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const dist = getDistanceFromLatLonInM(coords.latitude, coords.longitude, order.lat, order.lng);
            setDistance(dist);
            if (dist > 100) { // 100 metros
                setIsFar(true);
            }
        } catch (e) {
            console.error("Error getting location for distance check:", e);
            Alert.alert("Error de Ubicación", "No se pudo obtener tu ubicación actual para verificar la distancia.");
            setIsFar(true); // Asumir que está lejos si no se puede obtener la ubicación
        }

        setModalVisible(true);
    };

    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso Requerido', 'Necesitamos permiso para acceder a la cámara.');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled) {
            setPhoto(result.assets[0].base64);
        }
    };

    const submitCompletion = async () => {
        if (isFar && !photo) {
            Alert.alert('Foto Requerida', 'Debes tomar una foto para finalizar la orden si estás lejos del destino.');
            return;
        }

        if (!selectedOrder) return;

        setLoading(true);
        try {
            let loc = null;
            try {
                const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                loc = coords;
            } catch (e) {
                console.warn("Could not get current location for completion:", e);
            }

            await api.post(`/driver/orders/${selectedOrder.id}/complete`, {
                note,
                photo: photo ? `data:image/jpeg;base64,${photo}` : null,
                lat: loc?.latitude,
                lng: loc?.longitude,
            });

            Alert.alert('Éxito', 'Orden finalizada correctamente.');
            setModalVisible(false);
            fetchRoute(); // Refresh the route list
        } catch (e) {
            console.error("Error completing order:", e);
            Alert.alert('Error', 'No se pudo finalizar la orden: ' + (e.response?.data?.message || e.message));
        } finally {
            setLoading(false);
        }
    };

    const handleStartOrder = async (item) => {
        try {
            // 1. Optimistic UI (Keep this, it's good UX)
            // Use try-catch to avoid crashes if navigation app is missing
            try {
                const url = `google.navigation:q=${item.lat},${item.lng}`;
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                    await Linking.openURL(url);
                } else {
                    Alert.alert("Error", "No se puede abrir Google Maps");
                }
            } catch (err) {
                console.error("Navigation Error", err);
            }

            if (item.status === 'in_progress') return;

            setLoadingAction({ id: item.id, type: 'start' });
            const updated = route.map(r => r.id === item.id ? { ...r, status: 'in_progress' } : r);
            setRoute(updated);

            // 2. Safe async call
            setTimeout(async () => {
                try {
                    let loc = null;
                    try {
                        // Quick location check, fallback to null if fails
                        const status = await Location.getForegroundPermissionsAsync();
                        if (status.granted) {
                            loc = await Location.getLastKnownPositionAsync({});
                        }
                    } catch (e) { console.warn("Loc check failed"); }

                    await api.post(`/driver/orders/${item.id}/start`, {
                        lat: loc?.coords?.latitude,
                        lng: loc?.coords?.longitude
                    });
                } catch (e) {
                    console.log("Background API update failed, but UI handles it.");
                } finally {
                    setLoadingAction(null);
                }
            }, 100);

        } catch (e) {
            console.error("Start Order Error", e);
            setLoadingAction(null);
        }
    };

    const nextActiveOrder = route.find(r => r.status === 'in_progress') || route.find(r => r.status === 'pending');

    const renderItem = ({ item }) => {
        const isCompleted = item.status === 'completed';
        const isActive = nextActiveOrder && item.id === nextActiveOrder.id;
        const isPending = item.status === 'pending';
        const isDisabled = isPending && !isActive;

        const isStarting = loadingAction?.id === item.id && loadingAction?.type === 'start';

        return (
            <View style={[styles.card, isCompleted && { opacity: 0.6 }]}>
                <View style={styles.cardHeader}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>#{item.delivery_sequence}</Text>
                    </View>
                    <Text style={[styles.status, { color: isCompleted ? '#10b981' : '#facc15' }]}>
                        {isCompleted ? 'COMPLETADO' : (isActive ? 'EN CURSO' : 'PENDIENTE')}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <User size={16} color="#a1a1aa" />
                    <Text style={styles.customerName}>{item.customer_name}</Text>
                </View>

                <View style={[styles.infoRow, { alignItems: 'flex-start' }]}>
                    <MapPin size={16} color="#a1a1aa" style={{ marginTop: 2 }} />
                    <Text style={[styles.address, { flex: 1 }]}>{item.address_text}</Text>
                </View>

                {!isCompleted && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.callButton]}
                            onPress={() => handleCall(item.customer_phone)}
                        >
                            <Phone size={18} color="#fff" />
                        </TouchableOpacity>

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
                                {isStarting ? '...' : (item.status === 'in_progress' ? 'Retomar' : 'Ir')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.completeButton, isDisabled && { backgroundColor: '#3f3f46' }]}
                            onPress={() => handleOpenModal(item)}
                            disabled={isDisabled}
                        >
                            <CheckCircle size={18} color="#fff" />
                            <Text style={styles.actionText}>Fin</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    const handleLogout = async () => {
        try {
            const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
            if (hasStarted) {
                await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            }
        } catch (e) {
            console.error("Logout cleanup error", e);
        }
        logout();
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hola, {driver?.name || 'Conductor'}</Text>
                    <Text style={styles.status}>{isTracking ? '● Rastreo Activo' : '○ Rastreo Inactivo'}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={{ padding: 8 }}>
                    <LogOut color="#ef4444" size={24} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={route}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRoute} tintColor="#fff" />}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 }}>
                        <Package size={64} color="#3f3f46" />
                        <Text style={{ color: '#71717a', marginTop: 16 }}>No hay rutas asignadas</Text>
                    </View>
                }
            />

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalView}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Finalizar Entrega</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <X color="#fff" size={24} />
                        </TouchableOpacity>
                    </View>

                    {selectedOrder && (
                        <View style={{ marginBottom: 20 }}>
                            <Text style={styles.customerName}>{selectedOrder.customer_name}</Text>
                            <Text style={styles.address}>{selectedOrder.address_text}</Text>
                        </View>
                    )}

                    {isFar && (
                        <View style={styles.warningBox}>
                            <Text style={styles.warningText}>Ubicación Lejana</Text>
                            <Text style={styles.warningSubtext}>
                                Estás a {Math.round(distance)}m del destino. Se requiere foto obligatoria.
                            </Text>
                        </View>
                    )}

                    <Text style={styles.label}>Notas de Entrega</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej. Entregado en portería..."
                        placeholderTextColor="#71717a"
                        value={note}
                        onChangeText={setNote}
                        multiline
                    />

                    <Text style={styles.label}>Foto de Comprobante {isFar && '*'}</Text>
                    <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                        {photo ? (
                            <Image source={{ uri: `data:image/jpeg;base64,${photo}` }} style={styles.photoPreview} resizeMode="cover" />
                        ) : (
                            <>
                                <CameraIcon color="#a1a1aa" size={32} />
                                <Text style={styles.photoButtonText}>Tomar Foto</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.submitButton, loading && { opacity: 0.7 }]}
                        onPress={submitCompletion}
                        disabled={loading}
                    >
                        {loading && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />}
                        <Text style={styles.submitText}>{loading ? 'Finalizando...' : 'Confirmar Entrega'}</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
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
