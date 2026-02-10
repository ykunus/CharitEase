const express = require('express');
const cors = require('cors');
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running!', timestamp: new Date().toISOString() });
});

// === STRIPE CONNECT ENDPOINTS ===

// 1. Create a Stripe Connect account for a charity
app.post('/create-charity-account', async (req, res) => {
  try {
    const { charityName, email, country = 'US' } = req.body;

    if (!charityName || !email) {
      return res.status(400).json({
        error: { message: 'Charity name and email are required' }
      });
    }

    const account = await stripe.accounts.create({
      type: 'standard', // Gives charities full control
      country: country,
      email: email,
      business_profile: {
        name: charityName,
        product_description: 'Charitable donations and fundraising',
      },
      metadata: {
        platform: 'CharitEase',
        charity_name: charityName,
      },
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL || 'https://yourapp.com'}/charity/onboarding/refresh`,
      return_url: `${process.env.FRONTEND_URL || 'https://yourapp.com'}/charity/onboarding/complete`,
      type: 'account_onboarding',
    });

    console.log(`✅ Created Stripe account for charity: ${charityName} (${account.id})`);

    res.json({
      account_id: account.id,
      onboarding_url: accountLink.url,
      charity_name: charityName,
    });
  } catch (error) {
    console.error('Charity account creation failed:', error);
    res.status(400).json({ 
      error: { 
        message: error.message,
        type: error.type 
      } 
    });
  }
});

// 2. Get charity account status (POST version for mobile app compatibility)
app.post('/charity-account-status', async (req, res) => {
  try {
    const { account_id } = req.body;

    if (!account_id) {
      return res.status(400).json({
        error: { message: 'Account ID is required' }
      });
    }

    // Demo mode - return mock data for demo accounts
    if (account_id.startsWith('acct_demo_')) {
      console.log(`🎭 Demo mode: Returning mock status for ${account_id}`);
      
      // Mock different statuses for different demo accounts
      const demoStatuses = {
        'acct_demo_charity_1': { charges_enabled: true, payouts_enabled: true },
        'acct_demo_charity_2': { charges_enabled: true, payouts_enabled: true },
        'acct_demo_charity_4': { charges_enabled: true, payouts_enabled: true },
        'acct_demo_charity_5': { charges_enabled: true, payouts_enabled: true },
      };

      const status = demoStatuses[account_id] || { charges_enabled: false, payouts_enabled: false };

      return res.json({
        account_id: account_id,
        charges_enabled: status.charges_enabled,
        payouts_enabled: status.payouts_enabled,
        details_submitted: status.charges_enabled,
        onboarding_complete: status.charges_enabled,
        demo_mode: true,
        requirements: status.charges_enabled ? { currently_due: [] } : { currently_due: ['business_profile.url'] },
        business_profile: {
          name: 'Demo Charity',
          product_description: 'Charitable donations'
        },
      });
    }

    // Real Stripe account check (for production)
    const account = await stripe.accounts.retrieve(account_id);
    
    res.json({
      account_id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      onboarding_complete: account.charges_enabled && account.details_submitted,
      demo_mode: false,
      requirements: account.requirements,
      business_profile: account.business_profile,
    });
  } catch (error) {
    console.error('Account status check failed:', error);
    res.status(400).json({ 
      error: { 
        message: error.message,
        type: error.type 
      } 
    });
  }
});

// 2b. Get charity account status (GET version for direct URL access)
app.get('/charity-account-status/:accountId', async (req, res) => {
  try {
    const account_id = req.params.accountId;

    // Demo mode - return mock data for demo accounts
    if (account_id.startsWith('acct_demo_')) {
      console.log(`🎭 Demo mode: Returning mock status for ${account_id}`);
      
      const demoStatuses = {
        'acct_demo_charity_1': { charges_enabled: true, payouts_enabled: true },
        'acct_demo_charity_2': { charges_enabled: true, payouts_enabled: true },
        'acct_demo_charity_4': { charges_enabled: true, payouts_enabled: true },
        'acct_demo_charity_5': { charges_enabled: true, payouts_enabled: true },
      };

      const status = demoStatuses[account_id] || { charges_enabled: false, payouts_enabled: false };

      return res.json({
        account_id: account_id,
        charges_enabled: status.charges_enabled,
        payouts_enabled: status.payouts_enabled,
        details_submitted: status.charges_enabled,
        onboarding_complete: status.charges_enabled,
        demo_mode: true,
        requirements: status.charges_enabled ? { currently_due: [] } : { currently_due: ['business_profile.url'] },
        business_profile: {
          name: 'Demo Charity',
          product_description: 'Charitable donations'
        },
      });
    }

    // Real Stripe account check
    const account = await stripe.accounts.retrieve(account_id);
    
    res.json({
      account_id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      onboarding_complete: account.charges_enabled && account.details_submitted,
      demo_mode: false,
      requirements: account.requirements,
      business_profile: account.business_profile,
    });
  } catch (error) {
    console.error('Account status check failed:', error);
    res.status(400).json({ 
      error: { 
        message: error.message,
        type: error.type 
      } 
    });
  }
});

// 3. Create payment intent with destination (Stripe Connect)
app.post('/create-donation-with-destination', async (req, res) => {
  try {
    const { 
      amount, 
      destination_account, 
      charityAccountId, // Legacy field name
      platform_fee_percent = 2.5,
      platformFeePercent = 2.5, // Legacy field name
      charity_name,
      donor_message 
    } = req.body;

    if (!amount || amount < 50) {
      return res.status(400).json({
        error: { message: 'Amount must be at least $0.50' }
      });
    }

    // Support both field names for account ID
    const accountId = destination_account || charityAccountId;
    if (!accountId) {
      return res.status(400).json({
        error: { message: 'Charity account ID is required (destination_account or charityAccountId)' }
      });
    }

    // Support both field names for fee percentage
    const feePercent = platform_fee_percent || platformFeePercent;

    // Demo mode for demo accounts
    if (accountId.startsWith('acct_demo_')) {
      console.log(`🎭 Demo mode: Creating payment intent for ${accountId}`);
      
      const platformFee = Math.round(amount * (feePercent / 100));
      const charityAmount = amount - platformFee;

      // Create regular payment intent (no Connect features for demo)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          source: 'CharitEase Mobile App (Demo Mode)',
          demo_charity_account: accountId,
          demo_platform_fee: platformFee,
          demo_charity_amount: charityAmount,
          demo_platform_fee_percent: feePercent,
          charity_name: charity_name || 'Demo Charity',
          donor_message: donor_message || 'Demo donation',
        },
      });

      console.log(`💰 Demo donation payment intent: $${amount/100} (Fee: $${platformFee/100}, To charity: $${charityAmount/100})`);

      return res.json({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        platform_fee: platformFee,
        charity_amount: charityAmount,
        total_amount: amount,
        demo_mode: true,
        demo_note: 'This is a demo payment. No actual transfer to charity account.',
      });
    }

    // Real Stripe Connect flow for production accounts
    // Verify charity account is ready
    const account = await stripe.accounts.retrieve(accountId);
    if (!account.charges_enabled) {
      return res.status(400).json({
        error: { message: 'Charity account is not ready to accept payments' }
      });
    }

    const platformFee = Math.round(amount * (feePercent / 100));
    const charityAmount = amount - platformFee;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      application_fee_amount: platformFee, // Your platform fee
      transfer_data: {
        destination: accountId, // Charity's account
      },
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        source: 'CharitEase Mobile App',
        charity_account: accountId,
        platform_fee: platformFee,
        charity_amount: charityAmount,
        platform_fee_percent: feePercent,
        charity_name: charity_name || 'Unknown Charity',
        donor_message: donor_message || 'No message',
      },
    });

    console.log(`💰 Real donation payment intent: $${amount/100} (Fee: $${platformFee/100}, To charity: $${charityAmount/100})`);

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      platform_fee: platformFee,
      charity_amount: charityAmount,
      total_amount: amount,
      demo_mode: false,
    });
  } catch (error) {
    console.error('Donation payment intent creation failed:', error);
    res.status(400).json({ 
      error: { 
        message: error.message,
        type: error.type 
      } 
    });
  }
});

// 4. Create new account link (for re-onboarding)
app.post('/create-account-link', async (req, res) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({
        error: { message: 'Account ID is required' }
      });
    }
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.FRONTEND_URL || 'https://yourapp.com'}/charity/onboarding/refresh`,
      return_url: `${process.env.FRONTEND_URL || 'https://yourapp.com'}/charity/onboarding/complete`,
      type: 'account_onboarding',
    });

    res.json({
      onboarding_url: accountLink.url,
    });
  } catch (error) {
    console.error('Account link creation failed:', error);
    res.status(400).json({ 
      error: { 
        message: error.message,
        type: error.type 
      } 
    });
  }
});

// === ORIGINAL ENDPOINT (kept for backwards compatibility) ===

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount < 50) { // Stripe minimum is $0.50
      return res.status(400).json({
        error: {
          message: 'Amount must be at least $0.50',
        },
      });
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        source: 'CharitEase Mobile App',
      },
    });

    res.send({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    });
  } catch (error) {
    console.error('Payment Intent creation failed:', error);
    res.status(400).send({
      error: {
        message: error.message,
        type: error.type,
      },
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🏪 Stripe Connect enabled for marketplace payments`);
  if (process.env.STRIPE_SECRET_KEY) {
    console.log(`🔑 Stripe configured with key: ${process.env.STRIPE_SECRET_KEY.substring(0, 12)}...`);
  } else {
    console.log('⚠️  Warning: STRIPE_SECRET_KEY not found in environment variables');
  }
});