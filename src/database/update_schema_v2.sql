-- Add authentication columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Update existing test tenant with a default login
-- We will handle the password hashing in the JS script, this is just to ensure columns exist
