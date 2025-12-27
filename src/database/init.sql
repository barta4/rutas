-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- 0. Tenants (Empresas)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    api_key VARCHAR(100) UNIQUE NOT NULL,
    config JSONB, -- { "ai_enabled": true, "prediction_margin": 15 }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Conductores y Telemetría
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(100),
    phone VARCHAR(20),
    last_location GEOGRAPHY(Point, 4326),
    last_ping TIMESTAMP WITH TIME ZONE,
    active_route_id UUID,
    active BOOLEAN DEFAULT TRUE
);

-- 2. Órdenes con Predicción e IA
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    address_text TEXT, -- Dirección original enviada
    address_normalized TEXT, -- Dirección corregida por IA
    coordinates GEOGRAPHY(Point, 4326),
    status VARCHAR(20) DEFAULT 'pending',
    estimated_arrival TIMESTAMP WITH TIME ZONE,
    ai_risk_score FLOAT DEFAULT 0, -- Score de 0 a 1 de probabilidad de fallo
    ai_fix_notes TEXT, -- Explicación de la IA sobre la corrección de dirección
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Histórico de Ubicaciones
CREATE TABLE IF NOT EXISTS location_logs (
    id BIGSERIAL PRIMARY KEY,
    driver_id UUID REFERENCES drivers(id),
    location GEOGRAPHY(Point, 4326),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
