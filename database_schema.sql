-- CharitEase Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Regular Donors)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    country TEXT,
    bio TEXT, -- New field for user bio
    avatar_url TEXT,
    total_donated NUMERIC DEFAULT 0,
    total_donations INTEGER DEFAULT 0,
    followed_charities UUID[] DEFAULT '{}', -- Array of charity IDs
    user_type TEXT DEFAULT 'user' CHECK (user_type IN ('user', 'charity', 'platform_admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Charities Table (Enhanced for Charity Accounts)
CREATE TABLE IF NOT EXISTS charities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL, -- Charity admin email
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    country TEXT NOT NULL,
    founded_year INTEGER,
    verified BOOLEAN DEFAULT false,
    logo_url TEXT,
    cover_image_url TEXT, -- Renamed for consistency
    mission TEXT NOT NULL,
    website TEXT, -- New field for charity website
    phone TEXT, -- New field for charity phone
    address TEXT, -- New field for charity address
    total_raised NUMERIC DEFAULT 0,
    followers INTEGER DEFAULT 0, -- Renamed for consistency
    impact JSONB, -- Flexible impact data storage
    user_type TEXT DEFAULT 'charity' CHECK (user_type IN ('user', 'charity', 'platform_admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Platform Admins Table
CREATE TABLE IF NOT EXISTS platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'platform_admin' CHECK (role IN ('platform_admin', 'super_admin')),
    permissions JSONB DEFAULT '{}', -- Flexible permissions storage
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Posts Table
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    charity_id UUID REFERENCES charities(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('milestone', 'update', 'story')),
    title TEXT,
    content TEXT NOT NULL,
    image_url TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Donations Table
CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    charity_id UUID REFERENCES charities(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    message TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Follows Table (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    charity_id UUID REFERENCES charities(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, charity_id) -- Prevent duplicate follows
);

-- 7. Likes Table (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, post_id) -- Prevent duplicate likes
);

-- 8. Comments Table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Indexes for Performance
CREATE INDEX idx_posts_charity_created ON posts(charity_id, created_at DESC);
CREATE INDEX idx_donations_user_created ON donations(user_id, created_at DESC);
CREATE INDEX idx_follows_user ON follows(user_id);
CREATE INDEX idx_likes_post ON likes(post_id);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_charities_category ON charities(category);
CREATE INDEX idx_charities_country ON charities(country);
CREATE INDEX idx_charities_verified ON charities(verified);

-- Create Updated At Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add Updated At Triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_charities_updated_at BEFORE UPDATE ON charities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_platform_admins_updated_at BEFORE UPDATE ON platform_admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert Sample Data
INSERT INTO charities (email, name, category, country, founded_year, verified, logo_url, cover_image_url, mission, website, phone, address, total_raised, followers, impact) VALUES
('admin@syrian-education.org', 'Syrian Education Foundation', 'Education', 'Syria', 2015, true, 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&h=200&fit=crop&crop=face', 'https://images.unsplash.com/photo-1523240798131-586a4680c3a0?w=400&h=200&fit=crop', 'Providing quality education opportunities for Syrian children affected by conflict, ensuring they have access to learning materials, safe spaces, and qualified teachers.', 'https://syrian-education.org', '+963-11-123-4567', 'Damascus, Syria', 245000, 12400, '{"studentsSupported": 1250, "schoolsBuilt": 8, "teachersTrained": 45, "booksDistributed": 15000}'),
('contact@hope-syria-medical.org', 'Hope for Syria Medical', 'Healthcare', 'Syria', 2013, true, 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=200&fit=crop', 'Delivering critical medical care and supplies to Syrian communities, operating mobile clinics and supporting local healthcare workers.', 'https://hope-syria-medical.org', '+963-11-234-5678', 'Aleppo, Syria', 189000, 8900, '{"patientsTreated": 3200, "clinicsOperated": 12, "medicalSuppliesDistributed": 8500, "surgeriesPerformed": 450}'),
('info@syrian-community.org', 'Syrian Community Development', 'Community Development', 'Syria', 2016, false, 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=200&h=200&fit=crop&crop=face', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&h=200&fit=crop', 'Rebuilding Syrian communities through infrastructure development, job creation, and social programs that restore hope and stability.', 'https://syrian-community.org', '+963-11-345-6789', 'Homs, Syria', 156000, 6800, '{"jobsCreated": 320, "homesRebuilt": 45, "communityCenters": 6, "familiesSupported": 890}'),
('admin@afghan-women-education.org', 'Afghan Women''s Education Initiative', 'Education', 'Afghanistan', 2018, true, 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=200&fit=crop&crop=face', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=200&fit=crop', 'Empowering Afghan women and girls through education, vocational training, and leadership development programs.', 'https://afghan-women-education.org', '+93-20-123-4567', 'Kabul, Afghanistan', 98000, 5600, '{"womenEducated": 1200, "vocationalPrograms": 15, "scholarshipsAwarded": 85, "literacyClasses": 42}'),
('contact@lebanese-relief.org', 'Lebanese Relief Network', 'Disaster Relief', 'Lebanon', 2020, true, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=200&fit=crop', 'Providing emergency relief and long-term recovery support to Lebanese communities affected by crisis and natural disasters.', 'https://lebanese-relief.org', '+961-1-123-4567', 'Beirut, Lebanon', 320000, 15200, '{"familiesAided": 2100, "emergencySupplies": 15000, "shelterProvided": 320, "mealsServed": 45000}'),
('info@iraqi-youth.org', 'Iraqi Youth Development', 'Youth Development', 'Iraq', 2017, false, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=200&fit=crop', 'Nurturing the next generation of Iraqi leaders through mentorship, skills training, and community engagement programs.', 'https://iraqi-youth.org', '+964-1-123-4567', 'Baghdad, Iraq', 78000, 4200, '{"youthMentored": 850, "skillsWorkshops": 28, "leadershipPrograms": 12, "communityProjects": 35}');

-- Insert Sample Posts
INSERT INTO posts (charity_id, type, title, content, image_url, likes_count, comments_count, shares_count, created_at) VALUES
((SELECT id FROM charities WHERE name = 'Syrian Education Foundation'), 'milestone', '🎉 Major Milestone Reached!', 'We''re thrilled to announce that we''ve successfully built our 8th school in northern Syria! This new facility will provide education for 200 children who previously had no access to schooling. Thank you to all our supporters who made this possible!', 'https://images.unsplash.com/photo-1523240798131-586a4680c3a0?w=400&h=300&fit=crop', 342, 28, 15, NOW() - INTERVAL '2 days'),
((SELECT id FROM charities WHERE name = 'Hope for Syria Medical'), 'update', 'Medical Mission Update', 'Our mobile clinic team visited 3 remote villages this week, treating 156 patients including 45 children. We distributed essential medicines and provided critical care to families who have been without medical access for months.', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop', 189, 12, 8, NOW() - INTERVAL '4 days'),
((SELECT id FROM charities WHERE name = 'Afghan Women''s Education Initiative'), 'story', 'Fatima''s Story', 'Meet Fatima, a 22-year-old Afghan woman who graduated from our vocational training program. She now runs her own tailoring business and employs 3 other women. "Education gave me hope when I had none," she says. Stories like Fatima''s inspire us every day.', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop', 456, 34, 22, NOW() - INTERVAL '6 days'),
((SELECT id FROM charities WHERE name = 'Lebanese Relief Network'), 'milestone', 'Emergency Response Success', 'In response to the recent crisis, our team successfully distributed emergency supplies to 500 families across Beirut. Food packages, hygiene kits, and essential medicines reached those who needed them most. Thank you for your continued support!', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop', 278, 19, 12, NOW() - INTERVAL '8 days'),
((SELECT id FROM charities WHERE name = 'Syrian Community Development'), 'update', 'Community Center Opening', 'We''re excited to announce the opening of our 6th community center in Damascus! This new facility will provide job training, childcare services, and community events for over 300 families. The center includes a computer lab, library, and meeting rooms.', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&h=300&fit=crop', 167, 15, 9, NOW() - INTERVAL '10 days'),
((SELECT id FROM charities WHERE name = 'Iraqi Youth Development'), 'story', 'Ahmed''s Leadership Journey', 'Ahmed, a 19-year-old from Baghdad, joined our youth leadership program last year. Today, he''s organizing community clean-up initiatives and mentoring younger participants. "This program showed me that I can make a difference in my community," he shares proudly.', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop', 234, 21, 14, NOW() - INTERVAL '12 days'),
((SELECT id FROM charities WHERE name = 'Hope for Syria Medical'), 'milestone', '1000 Surgeries Completed', 'Today we celebrate a major milestone - our medical teams have successfully completed 1000 life-saving surgeries! Each procedure represents a life changed, a family given hope. We''re grateful to our medical volunteers and supporters who make this work possible.', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop', 523, 42, 31, NOW() - INTERVAL '14 days');

-- Create a demo user
INSERT INTO users (email, name, country, bio, avatar_url, total_donated, total_donations, user_type) VALUES
('demo@charitease.com', 'Demo User', 'Syria', 'Passionate about making a difference in the world through charitable giving.', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', 0, 0, 'user');

-- Create a platform admin
INSERT INTO platform_admins (email, name, role, permissions) VALUES
('admin@charitease.com', 'Platform Administrator', 'platform_admin', '{"can_verify_charities": true, "can_manage_users": true, "can_view_analytics": true}');

-- Create sample donations
INSERT INTO donations (user_id, charity_id, amount, message, created_at) VALUES
((SELECT id FROM users WHERE email = 'demo@charitease.com'), (SELECT id FROM charities WHERE name = 'Syrian Education Foundation'), 150, 'Supporting education for Syrian children', NOW() - INTERVAL '30 days'),
((SELECT id FROM users WHERE email = 'demo@charitease.com'), (SELECT id FROM charities WHERE name = 'Hope for Syria Medical'), 100, 'Medical supplies for families in need', NOW() - INTERVAL '40 days'),
((SELECT id FROM users WHERE email = 'demo@charitease.com'), (SELECT id FROM charities WHERE name = 'Afghan Women''s Education Initiative'), 200, 'Empowering Afghan women through education', NOW() - INTERVAL '50 days'),
((SELECT id FROM users WHERE email = 'demo@charitease.com'), (SELECT id FROM charities WHERE name = 'Syrian Education Foundation'), 75, 'School supplies for children', NOW() - INTERVAL '60 days'),
((SELECT id FROM users WHERE email = 'demo@charitease.com'), (SELECT id FROM charities WHERE name = 'Hope for Syria Medical'), 50, 'Emergency medical aid', NOW() - INTERVAL '70 days');

-- Create sample follows
INSERT INTO follows (user_id, charity_id, created_at) VALUES
((SELECT id FROM users WHERE email = 'demo@charitease.com'), (SELECT id FROM charities WHERE name = 'Syrian Education Foundation'), NOW() - INTERVAL '80 days'),
((SELECT id FROM users WHERE email = 'demo@charitease.com'), (SELECT id FROM charities WHERE name = 'Hope for Syria Medical'), NOW() - INTERVAL '85 days'),
((SELECT id FROM users WHERE email = 'demo@charitease.com'), (SELECT id FROM charities WHERE name = 'Afghan Women''s Education Initiative'), NOW() - INTERVAL '90 days');
