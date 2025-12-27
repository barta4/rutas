-- Comprehensive Proof of Delivery Fields
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS completion_notes TEXT,
ADD COLUMN IF NOT EXISTS completion_coordinates GEOMETRY(Point, 4326),
ADD COLUMN IF NOT EXISTS distance_from_target INT; -- stored in meters

-- Note: proof_of_delivery is already JSONB from previous migration, but if not we ensure it exists or we use it for extended metadata
-- We will effectively upgrade the usage of 'proof_of_delivery' to store the JSON structure defined in the plan.
