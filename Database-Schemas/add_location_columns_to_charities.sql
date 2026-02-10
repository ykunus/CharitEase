-- Migration: Add location columns to charities table
-- Run this in Supabase SQL Editor to enable location-based features

-- Add location_lat and location_lon columns to charities table (allows NULL for charities without location)
ALTER TABLE charities 
ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_lon DOUBLE PRECISION;

-- Create index for better query performance on location-based searches
CREATE INDEX IF NOT EXISTS idx_charities_location ON charities(location_lat, location_lon) 
WHERE location_lat IS NOT NULL AND location_lon IS NOT NULL;

-- Optional: Update existing charities with location data if you have it
-- You can manually update charities with their coordinates using:
-- UPDATE charities SET location_lat = <latitude>, location_lon = <longitude> WHERE email = '<email>';

