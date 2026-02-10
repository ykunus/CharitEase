-- CharitEase Database Migration Script
-- Run this in Supabase SQL Editor to update existing database with new role-based features

-- 1. Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS followed_charities UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'user' CHECK (user_type IN ('user', 'charity', 'platform_admin'));

-- 2. Add new columns to charities table
ALTER TABLE charities 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS founded_year INTEGER,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS followers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'charity' CHECK (user_type IN ('user', 'charity', 'platform_admin'));

-- 3. Create platform_admins table
CREATE TABLE IF NOT EXISTS platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'platform_admin' CHECK (role IN ('platform_admin', 'super_admin')),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Update existing charities with sample email addresses
UPDATE charities SET email = 'admin@syrian-education.org' WHERE name = 'Syrian Education Foundation';
UPDATE charities SET email = 'contact@hope-syria-medical.org' WHERE name = 'Hope for Syria Medical';
UPDATE charities SET email = 'info@syrian-community.org' WHERE name = 'Syrian Community Development';
UPDATE charities SET email = 'admin@afghan-women-education.org' WHERE name = 'Afghan Women''s Education Initiative';
UPDATE charities SET email = 'contact@lebanese-relief.org' WHERE name = 'Lebanese Relief Network';
UPDATE charities SET email = 'info@iraqi-youth.org' WHERE name = 'Iraqi Youth Development';

-- 5. Update existing charities with additional fields
UPDATE charities SET 
    founded_year = 2015,
    website = 'https://syrian-education.org',
    phone = '+963-11-123-4567',
    address = 'Damascus, Syria',
    cover_image_url = 'https://images.unsplash.com/photo-1523240798131-586a4680c3a0?w=400&h=200&fit=crop',
    followers = 12400
WHERE name = 'Syrian Education Foundation';

UPDATE charities SET 
    founded_year = 2013,
    website = 'https://hope-syria-medical.org',
    phone = '+963-11-234-5678',
    address = 'Aleppo, Syria',
    cover_image_url = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=200&fit=crop',
    followers = 8900
WHERE name = 'Hope for Syria Medical';

UPDATE charities SET 
    founded_year = 2016,
    website = 'https://syrian-community.org',
    phone = '+963-11-345-6789',
    address = 'Homs, Syria',
    cover_image_url = 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&h=200&fit=crop',
    followers = 6800
WHERE name = 'Syrian Community Development';

UPDATE charities SET 
    founded_year = 2018,
    website = 'https://afghan-women-education.org',
    phone = '+93-20-123-4567',
    address = 'Kabul, Afghanistan',
    cover_image_url = 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=200&fit=crop',
    followers = 5600
WHERE name = 'Afghan Women''s Education Initiative';

UPDATE charities SET 
    founded_year = 2020,
    website = 'https://lebanese-relief.org',
    phone = '+961-1-123-4567',
    address = 'Beirut, Lebanon',
    cover_image_url = 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=200&fit=crop',
    followers = 15200
WHERE name = 'Lebanese Relief Network';

UPDATE charities SET 
    founded_year = 2017,
    website = 'https://iraqi-youth.org',
    phone = '+964-1-123-4567',
    address = 'Baghdad, Iraq',
    cover_image_url = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=200&fit=crop',
    followers = 4200
WHERE name = 'Iraqi Youth Development';

-- 6. Update existing users with new fields
UPDATE users SET 
    bio = 'Passionate about making a difference in the world through charitable giving.',
    total_donated = 0,
    total_donations = 0,
    followed_charities = '{}'
WHERE email = 'demo@charitease.com';

-- 7. Add trigger for platform_admins table
CREATE TRIGGER update_platform_admins_updated_at 
BEFORE UPDATE ON platform_admins 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_charities_user_type ON charities(user_type);
CREATE INDEX IF NOT EXISTS idx_charities_email ON charities(email);
CREATE INDEX IF NOT EXISTS idx_platform_admins_role ON platform_admins(role);

-- 9. Insert a platform admin
INSERT INTO platform_admins (email, name, role, permissions) VALUES
('admin@charitease.com', 'Platform Administrator', 'platform_admin', '{"can_verify_charities": true, "can_manage_users": true, "can_view_analytics": true}')
ON CONFLICT (email) DO NOTHING;

-- 10. Add constraints to ensure data integrity
ALTER TABLE charities ALTER COLUMN email SET NOT NULL;
ALTER TABLE charities ALTER COLUMN founded_year SET NOT NULL;

-- Migration completed successfully!
SELECT 'Database migration completed successfully!' as status;
