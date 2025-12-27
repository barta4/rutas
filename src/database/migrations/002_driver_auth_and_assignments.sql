-- Add Auth fields to Drivers
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add Assignment fields to Orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES drivers(id),
ADD COLUMN IF NOT EXISTS delivery_sequence INT,
ADD COLUMN IF NOT EXISTS proof_of_delivery JSONB;
