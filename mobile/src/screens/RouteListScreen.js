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

// --- Background Task (Simulated) ---
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    // ... same as before
    if (data) {
        const { locations } = data;
        const location = locations[0];
        try {
            const driverStr = await SecureStore.getItemAsync('driver');
            if (driverStr) {
                const driver = JSON.parse(driverStr);
                await api.post('/telemetry', {
                    driver_id: driver.id,
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                    timestamp: location.timestamp
                });
            }
        } catch (e) { }
    }
});

function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d * 1000; // Distance in meters
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

export default function RouteListScreen() {
    const { driver, logout } = useAuthStore();
    const [route, setRoute] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isTracking, setIsTracking] = useState(false);

    // --- POD Modal State ---
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
        checkPermissions();
        checkTrackingStatus();
    }, []);

    const checkPermissions = async () => {
        // Location
        await Location.requestForegroundPermissionsAsync();
        // Camera
        await ImagePicker.requestCameraPermissionsAsync();
    };

    // ... (Tracking logic same as before)
    const checkTrackingStatus = async () => {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        setIsTracking(hasStarted);
    };

    const toggleTracking = async () => {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (hasStarted) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            setIsTracking(false);
        } else {
            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                accuracy: Location.Accuracy.High,
                distanceInterval: 50,
                deferredUpdatesInterval: 10000,
                foregroundService: {
                    notificationTitle: "Logística AI",
                    notificationBody: "Compartiendo ubicación...",
                },
            });
            setIsTracking(true);
        }
    };

    const handleCompletePress = async (item) => {
        setSelectedOrder(item);
        setNote('');
        setPhoto(null);

        // Check Distance
        let loc = await Location.getCurrentPositionAsync({});
        const dist = getDistanceFromLatLonInM(
            loc.coords.latitude, loc.coords.longitude,
            item.lat, item.lng
        );

        setDistance(dist);
        setIsFar(dist > 150); // Threshold 150m

        setModalVisible(true);
    };

    const takePhoto = async () => {
        let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setPhoto(result.assets[0]);
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

            // Current Coords
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
                // Determine file type
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
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setModalVisible(false);
            Alert.alert("Éxito", "Orden completada correctamente.");
            fetchRoute();

        } catch (e) {
            console.error(e);
            Alert.alert("Error", "No se pudo completar la orden.");
        } finally {
            setLoading(false);
        }
    };

    // Determine Next Active Order based on sequence
    // Assumes route is sorted by delivery_sequence
    const pendingOrders = route.filter(o => o.status === 'pending');
    const nextActiveOrder = pendingOrders.length > 0 ? pendingOrders.reduce((prev, curr) => prev.delivery_sequence < curr.delivery_sequence ? prev : curr) : null;

    const handleCall = (phone) => {
        if (!phone) {
            Alert.alert("Sin número", "Este cliente no tiene teléfono registrado.");
            return;
        }
        Linking.openURL(`tel:${phone}`);
    };

    const renderItem = ({ item }) => {
        const isCompleted = item.status === 'completed';
        const isActive = nextActiveOrder && item.id === nextActiveOrder.id;
        const isPending = item.status === 'pending';

        // Logic:
        // - Completed: Visible but different style.
        // - Active (Next Pending): Full opacity, Enabled.
        // - Other Pending: Grayed out, Disabled.
        const isDisabled = isPending && !isActive;

        return (
            <View style={[
                styles.card,
                isDisabled && { opacity: 0.5 },
                isCompleted && { borderColor: '#10b981', borderWidth: 1 }
            ]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.badge, isActive && { backgroundColor: '#8b5cf6' }]}>
                        <Text style={[styles.badgeText, isActive && { color: '#fff' }]}>#{item.delivery_sequence}</Text>
                    </View>
                    <Text style={[styles.status, { color: isCompleted ? '#10b981' : '#facc15' }]}>
                        {isCompleted ? 'COMPLETADO' : (isActive ? 'EN CURSO' : 'PENDIENTE')}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Package size={20} color="#a1a1aa" />
                    <Text style={styles.customerName}>{item.customer_name}</Text>
                </View>
                <View style={styles.infoRow}>
                    <MapPin size={20} color="#a1a1aa" />
                    <Text style={styles.address}>{item.address_text}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Phone size={20} color="#a1a1aa" />
                    <Text style={styles.detailText}>{item.customer_phone || 'Sin télefono'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <User size={20} color="#a1a1aa" />
                    <Text style={styles.detailText}>CI: {item.customer_cedula || 'N/A'}</Text>
                </View>

                {/* Actions - Only visible/enabled if Active or (optionally) Completed just for review */}
                {!isCompleted && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.callButton, isDisabled && { backgroundColor: '#3f3f46' }]}
                            onPress={() => handleCall(item.customer_phone)}
                            disabled={isDisabled}
                        >
                            <Phone size={18} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.navButton, isDisabled && { backgroundColor: '#3f3f46' }]}
                            onPress={() => Linking.openURL(`google.navigation:q=${item.lat},${item.lng}`)}
                            disabled={isDisabled}
                        >
                            <Navigation size={18} color="#fff" />
                            <Text style={styles.actionText}>Ir</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.completeButton, isDisabled && { backgroundColor: '#3f3f46' }]}
                            onPress={() => handleCompletePress(item)}
                            disabled={isDisabled}
                        >
                            <CheckCircle size={18} color="#fff" />
                            <Text style={styles.actionText}>Listo</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header same as before */}
            <View style={styles.header}>
                <Text style={styles.greeting}>Hola, {driver?.name}</Text>
                <TouchableOpacity onPress={logout}><LogOut size={24} color="#ef4444" /></TouchableOpacity>
            </View>

            <TouchableOpacity
                style={[styles.trackingButton, { backgroundColor: isTracking ? '#ef4444' : '#10b981' }]}
                onPress={toggleTracking}
            >
                <Radio size={20} color="#fff" />
                <Text style={styles.trackingText}>{isTracking ? 'Detener Rastreo' : 'Iniciar Ruta'}</Text>
            </TouchableOpacity>

            <FlatList
                data={route}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />

            {/* --- POD MODAL --- */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalView}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Confirmar Entrega</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <X size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {isFar && (
                        <View style={styles.warningBox}>
                            <Text style={styles.warningText}>⚠️ Estás lejos ({Math.round(distance)}m)</Text>
                            <Text style={styles.warningSubtext}>Indica el motivo de la excepción.</Text>
                        </View>
                    )}

                    <Text style={styles.label}>Nota / Motivo {isFar && "*"}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej. Entregado en recepción..."
                        placeholderTextColor="#666"
                        value={note}
                        onChangeText={setNote}
                    />

                    <Text style={styles.label}>Foto de Evidencia</Text>
                    {photo ? (
                        <View style={styles.photoContainer}>
                            <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                            <TouchableOpacity style={styles.retakeButton} onPress={takePhoto}>
                                <Text style={styles.retakeText}>Cambiar</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                            <CameraIcon size={24} color="#fff" />
                            <Text style={styles.photoButtonText}>Tomar Foto</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={submitCompletion}
                        disabled={loading}
                    >
                        <Text style={styles.submitText}>{loading ? 'Enviando...' : 'Finalizar Orden'}</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f13' },
    // Reuse previous styles...
    // New Modal Styles
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
    // --- Re-adding crucial previous styles to ensure it renders correctly ---
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, paddingTop: 60, backgroundColor: '#18181b' },
    greeting: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    trackingButton: { margin: 16, padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', gap: 8 },
    trackingText: { color: '#fff', fontWeight: 'bold' },
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
    callButton: { backgroundColor: '#e11d48', flex: 0.3 }, // New Pink/Red for Call
    navButton: { backgroundColor: '#3b82f6' },
    completeButton: { backgroundColor: '#10b981' },
    actionText: { color: '#fff', fontWeight: 'bold' },
    detailText: { color: '#d1d5db', fontSize: 14 }
});
