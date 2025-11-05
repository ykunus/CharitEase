-- Add Stripe Connect fields to your charities table
ALTER TABLE charities ADD COLUMN stripe_account_id VARCHAR(255);
ALTER TABLE charities ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE charities ADD COLUMN charges_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE charities ADD COLUMN payouts_enabled BOOLEAN DEFAULT FALSE;

-- Update donations table to track platform fees
ALTER TABLE donations ADD COLUMN stripe_account_id VARCHAR(255);
ALTER TABLE donations ADD COLUMN platform_fee_amount INTEGER DEFAULT 0;
ALTER TABLE donations ADD COLUMN net_amount INTEGER;

-- Example updated schema:
CREATE TABLE IF NOT EXISTS charities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  country VARCHAR(100),
  stripe_account_id VARCHAR(255), -- NEW: Stripe Connect account ID
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE, -- NEW: Onboarding status
  charges_enabled BOOLEAN DEFAULT FALSE, -- NEW: Can accept charges
  payouts_enabled BOOLEAN DEFAULT FALSE, -- NEW: Can receive payouts
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS donations (
  id SERIAL PRIMARY KEY,
  charity_id INTEGER REFERENCES charities(id),
  user_id INTEGER REFERENCES users(id),
  amount INTEGER NOT NULL, -- Original donation amount in cents
  platform_fee_amount INTEGER DEFAULT 0, -- Platform fee in cents
  net_amount INTEGER, -- Amount charity receives (amount - platform_fee)
  stripe_payment_intent_id VARCHAR(255),
  stripe_account_id VARCHAR(255), -- Charity's Stripe account
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);