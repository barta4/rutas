-- 006_improvements.sql

-- 1. Create Depots Table
CREATE TABLE IF NOT EXISTS depots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    address_text TEXT,
    coordinates GEOGRAPHY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add New Fields to Orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_cedula VARCHAR(50),
ADD COLUMN IF NOT EXISTS depot_id UUID REFERENCES depots(id);
