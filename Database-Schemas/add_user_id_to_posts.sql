-- Migration: Add user_id column to posts table
-- Run this in Supabase SQL Editor to enable user post tracking

-- Add user_id column to posts table (allows NULL for charity posts)
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Update existing user posts if possible (posts with charity_id = NULL)
-- Note: This will only work if we can identify which user created them
-- You may need to manually update existing posts or leave them as-is
-- UPDATE posts SET user_id = (SELECT id FROM users WHERE ...) WHERE charity_id IS NULL;

