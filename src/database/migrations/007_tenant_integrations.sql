
-- Migration: 007_tenant_integrations.sql
-- Store credentials for external integrations (Dolibarr, Odoo, etc)

CREATE TABLE IF NOT EXISTS tenant_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'dolibarr', 'odoo', 'woocommerce'
    config JSONB DEFAULT '{}', -- { "url": "...", "api_key": "..." }
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, type)
);
