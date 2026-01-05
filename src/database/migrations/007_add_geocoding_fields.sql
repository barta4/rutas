-- Migration: Add geocoding refinement fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
