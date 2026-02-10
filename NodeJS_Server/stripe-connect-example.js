const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// 1. Create an account for a charity
app.post('/create-charity-account', async (req, res) => {
  try {
    const { charityName, email } = req.body;

    const account = await stripe.accounts.create({
      type: 'standard', // or 'express' for simpler onboarding
      country: 'US',
      email: email,
      business_profile: {
        name: charityName,
        product_description: 'Charitable donations and fundraising',
      },
    });

    res.json({
      account_id: account.id,
      onboarding_url: `https://connect.stripe.com/onboarding/${account.id}`,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 2. Create payment intent with destination
app.post('/create-donation-with-destination', async (req, res) => {
  try {
    const { amount, charityAccountId, platformFeePercent = 0 } = req.body;
    
    const platformFee = Math.round(amount * (platformFeePercent / 100));
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      application_fee_amount: platformFee, // Your platform fee
      transfer_data: {
        destination: charityAccountId, // Charity's account
      },
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        charity_account: charityAccountId,
        platform_fee: platformFee,
      },
    });

    res.json({
      client_secret: paymentIntent.client_secret,
      platform_fee: platformFee,
      charity_amount: amount - platformFee,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 3. Get charity onboarding status
app.get('/charity-account-status/:accountId', async (req, res) => {
  try {
    const account = await stripe.accounts.retrieve(req.params.accountId);
    
    res.json({
      account_id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements: account.requirements,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 4. Create account links for charity onboarding
app.post('/create-account-link', async (req, res) => {
  try {
    const { accountId } = req.body;
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: 'https://yourapp.com/charity/onboarding/refresh',
      return_url: 'https://yourapp.com/charity/onboarding/complete',
      type: 'account_onboarding',
    });

    res.json({
      onboarding_url: accountLink.url,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});