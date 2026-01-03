-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- 0. Tenants (Empresas)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    api_key VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    config JSONB, -- { "ai_enabled": true, "prediction_margin": 15 }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Conductores y Telemetría
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(100),
    username VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    vehicle_info VARCHAR(100),
    phone VARCHAR(20),
    last_location GEOGRAPHY(Point, 4326),
    last_ping TIMESTAMP WITH TIME ZONE,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    active_route_id UUID,
    active BOOLEAN DEFAULT TRUE
);

-- 1.5 Depósitos (Depots)
CREATE TABLE IF NOT EXISTS depots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    address_text TEXT,
    coordinates GEOGRAPHY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Órdenes con Predicción e IA
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    customer_cedula VARCHAR(20),
    address_text TEXT,
    address_normalized TEXT,
    coordinates GEOGRAPHY(Point, 4326),
    status VARCHAR(20) DEFAULT 'pending',
    
    -- Assignation
    driver_id UUID REFERENCES drivers(id),
    depot_id UUID REFERENCES depots(id),
    delivery_sequence INTEGER DEFAULT 0,

    -- Delivery Data
    proof_of_delivery JSONB, -- { "photos": [], "signature": "..." }
    completion_notes TEXT,
    distance_from_target FLOAT,

    estimated_arrival TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    ai_risk_score FLOAT DEFAULT 0,
    ai_fix_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Histórico de Ubicaciones
CREATE TABLE IF NOT EXISTS location_logs (
    id BIGSERIAL PRIMARY KEY,
    driver_id UUID REFERENCES drivers(id),
    location GEOGRAPHY(Point, 4326),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    url TEXT NOT NULL,
    event_type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
