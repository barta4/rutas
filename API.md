# Documentación de la API - Plataforma Logística

URL Base: `https://tu-dominio.com/v1` (o `http://localhost:3001/v1` en local)

Autenticación: Bearer Token (JWT).
Header: `Authorization: Bearer <token>`

## 1. Autenticación (Admin)

### Login
**POST** `/auth/login`
Autentica a un administrador (tenant) y devuelve un token JWT.

**Body:**
```json
{
  "email": "admin@empresa.com",
  "password": "secret_password"
}
```

**Respuesta:**
```json
{
  "token": "eyJhGVk...",
  "user": {
    "id": "uuid...",
    "name": "Empresa Demo",
    "email": "admin@empresa.com"
  }
}
```

---

## 2. Gestión de Choferes (Drivers)

### Listar Choferes
**GET** `/drivers`
Obtiene la lista de todos los choferes de la empresa.

### Crear Chofer
**POST** `/drivers`
Registra un nuevo conductor.

**Body:**
```json
{
  "name": "Juan Perez",
  "username": "juanp",
  "password": "123",
  "vehicle_info": "Camión AAA-123"
}
```

### Actualizar Chofer
**PUT** `/drivers/:id`

### Eliminar Chofer
**DELETE** `/drivers/:id`

---

## 3. App Móvil (Choferes)

### Login Chofer
**POST** `/driver/auth/login`
Login específico para la App Móvil.

**Body:**
```json
{
  "username": "juanp",
  "password": "123"
}
```

### Obtener Ruta Asignada
**GET** `/driver/route`
Devuelve las órdenes asignadas al chofer logueado para el día de hoy.

### Actualizar Estado de Orden (Entrega)
**POST** `/driver/orders/:id/status`
Reporta una entrega o fallo. Soporta subida de foto (Multipart).

**Body (Multipart/Form-Data):**
- `status`: "completed" | "failed"
- `notes`: "Entregado a portería"
- `photo`: (Archivo de imagen opcional)
- `lat`: -34.9011
- `lng`: -56.1645

---

## 4. Gestión de Pedidos (Orders)

### Crear Pedido
**POST** `/orders`

**Body:**
```json
{
  "customer_name": "Cliente Final",
  "customer_phone": "099123456",
  "address_text": "Av. 18 de Julio 1234, Montevideo",
  "coordinates": { "lat": -34.90, "lng": -56.18 } // Opcional
}
```

### Listar Pedidos
**GET** `/orders`

### Asignar Chofer / Editar
**PUT** `/orders/:id`
```json
{
  "driver_id": "uuid-driver..."
}
```

### Optimizar Ruta (IA)
**POST** `/orders/optimize`
Reordena las paradas de un chofer usando lógica de IA/VRP.

---

## 5. Depósitos (Depots)

### Listar Depósitos
**GET** `/depots`

### Crear Depósito
**POST** `/depots`

**Body:**
```json
{
  "name": "Depósito Central",
  "address_text": "Ruta 1 Km 10",
  "lat": -34.8,
  "lng": -56.2
}
```

---

## 6. Configuración (Company)

### Obtener Configuración
**GET** `/company`

### Actualizar Configuración
**PUT** `/company`
Permite cambiar nombre de empresa, email y contraseña (opcional).

---

## 7. Webhooks

### Listar Webhooks
**GET** `/webhooks`

### Registrar Webhook
**POST** `/webhooks`
```json
{
  "url": "https://mi-erp.com/callback",
  "event_type": "order.updated"
}
```

### Eliminar Webhook
**DELETE** `/webhooks/:id`

---

## 8. Dashboard y Métricas

### Estadísticas Generales
**GET** `/dashboard/stats`
Devuelve contadores de pedidos (pendientes, entregados), choferes activos, etc.

### Datos del Mapa
**GET** `/dashboard/map-data`
Devuelve todas las ubicaciones de choferes y pedidos en tiempo real para el mapa principal.

---

## 9. Telemetría

### Enviar Telemetría (GPS)
**POST** `/telemetry`
Usado por la App Móvil en segundo plano.

**Body:**
```json
{
  "lat": -34.9,
  "lng": -56.1,
  "timestamp": "2023-10-27T10:00:00Z"
}
```
