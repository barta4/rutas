-- Add SaaS fields to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP DEFAULT (NOW() + INTERVAL '14 days'),
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS max_drivers INT DEFAULT 5, /* Free tier limit */
ADD COLUMN IF NOT EXISTS max_orders INT DEFAULT 100; /* Monthly or total active limit placeholder */

-- Ensure demo admin has super admin privileges if needed, or create a specific super admin later manually
-- For now, let's just make the existing admin@demo.com a super admin for convenience
UPDATE tenants SET is_super_admin = TRUE WHERE email = 'admin@demo.com';
