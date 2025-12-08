# Stripe Connect Setup Guide for CharitEase

## Overview

CharitEase uses **Stripe Connect** to enable direct donations from users to charities. This is a marketplace-style payment system where:
- Donations go **directly** to the charity's Stripe account
- CharitEase automatically deducts a small platform fee (2.5%)
- Charities receive funds in their own Stripe account
- No manual transfer needed - everything is automated

---

## What is Required for Stripe to Work?

### 1. **Backend Server** ✅ (You have this)
- A Node.js server running with Stripe API integration
- Located in `backend-example/server.js`
- Must be running and accessible from your mobile app

### 2. **Stripe Account** (You need this)
- Create a Stripe account at https://dashboard.stripe.com
- Get your API keys (test keys for development, live keys for production)
- Enable Stripe Connect in your Stripe dashboard

### 3. **Database Columns** (For charities table)
Your `charities` table needs these columns:
- `stripe_account_id` (text) - Stores the Stripe Connect account ID
- `charges_enabled` (boolean) - Whether the charity can accept payments
- `platform_fee_percent` (decimal, optional) - Platform fee percentage (default: 2.5%)

### 4. **Mobile App Configuration**
- Stripe React Native SDK installed (`@stripe/stripe-react-native`)
- Backend server URL configured in `DonationModal.js` (currently: `http://172.20.50.39:3000`)

---

## How Donations Work Through Stripe

### Current Flow:

1. **User wants to donate** → Opens donation modal, enters amount
2. **App checks charity status** → Verifies charity has `stripe_account_id` and `charges_enabled = true`
3. **Backend creates Payment Intent** → 
   - Creates a Stripe Payment Intent with the charity's account as destination
   - Automatically calculates platform fee (2.5%)
   - Example: $100 donation = $97.50 to charity, $2.50 to platform
4. **User completes payment** → Stripe payment sheet handles card input securely
5. **Funds transfer automatically** → 
   - Full amount ($100) is charged to donor's card
   - Platform fee ($2.50) goes to your Stripe account
   - Charity amount ($97.50) goes directly to charity's Stripe account
6. **Donation recorded** → Saved to your database via `makeDonation()` function

---

## How a Charity Sets Up Stripe (Onboarding Process)

### Option 1: During Charity Sign-Up (Recommended)

When a charity creates an account, you would:

1. **Create Stripe Connect Account** (on backend)
   ```javascript
   POST /create-charity-account
   {
     "charityName": "Hope for Syria",
     "email": "contact@hope-syria.org",
     "country": "US"
   }
   ```

2. **Get Onboarding URL**
   - Backend returns `account_id` and `onboarding_url`
   - Save `account_id` to `charities.stripe_account_id` in your database

3. **Direct Charity to Onboarding**
   - Open the `onboarding_url` in a web browser
   - Charity completes Stripe's onboarding form:
     - Business information
     - Bank account details (where they'll receive funds)
     - Identity verification
     - Tax information

4. **Onboarding Complete**
   - Stripe verifies all information
   - Sets `charges_enabled = true` on their account
   - Charity can now accept donations!

### Option 2: Later Setup (In Settings)

Charities can set up payment processing later:

1. Add a "Payment Setup" button in charity settings
2. When clicked, call `/create-charity-account` (if they don't have one)
3. Open the onboarding URL in a web view or external browser
4. After completion, update their database record with `stripe_account_id`

---

## Backend Endpoints You Have

### 1. Create Charity Account
```
POST /create-charity-account
Body: { charityName, email, country }
Returns: { account_id, onboarding_url }
```
**Purpose**: Creates a Stripe Connect account for a charity and returns the onboarding URL

### 2. Check Account Status
```
POST /charity-account-status
Body: { account_id }
Returns: { charges_enabled, payouts_enabled, onboarding_complete }
```
**Purpose**: Check if charity has completed onboarding and can accept payments

### 3. Create Donation Payment
```
POST /create-donation-with-destination
Body: { amount, destination_account, platform_fee_percent, charity_name }
Returns: { client_secret }
```
**Purpose**: Creates a payment intent that routes money to the charity's account

### 4. Create Account Link (For Re-onboarding)
```
POST /create-account-link
Body: { account_id }
Returns: { url }
```
**Purpose**: Generates a new onboarding URL if charity needs to update info

---

## What Happens in Your Current Code

### In `DonationModal.js`:
```javascript
// Line 74: Checks if charity has Stripe set up
if (!charity.stripe_account_id || !charity.charges_enabled) {
  Alert.alert("Unable to Process Donation", 
    "This charity is still setting up their payment processing...");
  return; // Blocks donation if not set up
}

// Line 87-93: Verifies account status before payment
const statusResponse = await fetch(`${API_URL}/charity-account-status`, {
  method: "POST",
  body: JSON.stringify({ account_id: charity.stripe_account_id })
});

// Line 111-121: Creates payment intent with charity as destination
const response = await fetch(`${API_URL}/create-donation-with-destination`, {
  body: JSON.stringify({ 
    amount: parseFloat(amount) * 100, // Convert to cents
    destination_account: charity.stripe_account_id,
    platform_fee_percent: 2.5
  })
});
```

---

## Current Problem (Why Donations Don't Work)

Looking at your code, donations fail because:

1. **Charities don't have `stripe_account_id`** - They haven't been set up with Stripe Connect yet
2. **`charges_enabled` is false or missing** - The charity hasn't completed Stripe onboarding
3. **No onboarding flow implemented** - There's no way for charities to actually complete the Stripe setup

**Result**: The check on line 74 of `DonationModal.js` always fails, showing: *"This charity is still setting up their payment processing"*

---

## What You Need to Implement

### For Charities to Accept Donations:

1. **Add Stripe Account Creation to Sign-Up**
   - When charity creates account, call `/create-charity-account`
   - Save `account_id` to database
   - Store onboarding URL temporarily

2. **Add Onboarding Screen/Flow**
   - Create a screen that opens the onboarding URL
   - Can be a web view or external browser
   - After completion, check account status

3. **Update Charity Profile with Stripe Status**
   - Periodically check `charges_enabled` status
   - Update `charities.charges_enabled` in database
   - Show status in charity profile

4. **Add Payment Setup in Settings**
   - Button: "Set Up Payment Processing"
   - For charities that sign up but haven't set up Stripe yet
   - Redirects to onboarding flow

---

## Alternative: Simplified Donation Flow (Without Stripe Connect)

If you want donations to work **without** requiring each charity to set up Stripe:

1. **Collect donations to YOUR Stripe account** (not charity's)
2. **Manually transfer to charities** later
3. **Or** use Stripe's simpler payment flow (not Connect)

This means:
- ✅ Donations work immediately (no charity setup needed)
- ❌ You have to manually manage transfers
- ❌ More work for you, less transparent
- ❌ Platform fees handled differently

---

## Summary

**To make Stripe donations work, you need:**

1. ✅ Backend server (you have this)
2. ✅ Stripe account with API keys (you need to create)
3. ❌ Charity onboarding flow (not implemented yet)
4. ❌ Database columns for Stripe account IDs (may need to add)
5. ❌ Account creation during sign-up (not implemented)

**The main missing piece is**: A way for charities to actually create their Stripe Connect account and complete onboarding. Once that's done, donations will work automatically!

---

## Next Steps

Would you like me to:
1. Create the charity onboarding flow in your app?
2. Add Stripe account creation during charity sign-up?
3. Add database migration for Stripe columns?
4. Simplify to a non-Connect payment flow?

Let me know which approach you prefer!

