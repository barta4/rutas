-- Migration: 005_add_driver_location_cols.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='last_seen_at') THEN
        ALTER TABLE drivers ADD COLUMN last_seen_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='last_location') THEN
        -- Assuming PostGIS is installed, otherwise this might fail if type geometry doesn't exist
        -- But previous migrations used it, so it should be fine.
        ALTER TABLE drivers ADD COLUMN last_location GEOMETRY(Point, 4326);
    END IF;
END $$;
