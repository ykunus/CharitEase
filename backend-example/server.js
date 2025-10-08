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

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, payment_method_types = ['card'] } = req.body;

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
      payment_method_types: payment_method_types,
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
  if (process.env.STRIPE_SECRET_KEY) {
    console.log(`🔑 Stripe configured with key: ${process.env.STRIPE_SECRET_KEY.substring(0, 12)}...`);
  } else {
    console.log('⚠️  Warning: STRIPE_SECRET_KEY not found in environment variables');
  }
});