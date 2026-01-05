-- Migration: Create service_areas table
CREATE TABLE IF NOT EXISTS service_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id), -- Optional: if we want tenant-specific areas. If global, likely NULL or not used. Assuming global for now based on context, but let's make it flexible.
    city VARCHAR(100) NOT NULL,
    neighborhood VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraint to avoid duplicates
    CONSTRAINT unique_area UNIQUE (city, neighborhood) 
);

-- Index for fast lookup
CREATE INDEX idx_service_areas_city ON service_areas(city);
