
-- Migration: 006_system_settings.sql
-- Create table for global system configuration

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default APK URL if not exists
INSERT INTO system_settings (key, value)
VALUES ('driver_app_url', 'https://facilenvio.urufile.com/driver-app.apk')
ON CONFLICT (key) DO NOTHING;
