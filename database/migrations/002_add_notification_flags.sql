-- Migration: Add notification flags to orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS notification_sent_starting BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notification_sent_approaching BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
