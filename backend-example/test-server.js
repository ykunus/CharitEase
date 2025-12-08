// Quick test script to verify Stripe setup
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testStripe() {
  try {
    console.log('🔍 Testing Stripe connection...');
    console.log('📝 Key starts with:', process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 12) + '...' : 'NOT FOUND');
    
    // Test API call
    const account = await stripe.balance.retrieve();
    console.log('✅ Stripe connection successful!');
    console.log('💰 Available balance:', account.available[0]?.amount ? `$${(account.available[0].amount / 100).toFixed(2)}` : 'N/A');
    return true;
  } catch (error) {
    console.error('❌ Stripe connection failed:', error.message);
    return false;
  }
}

testStripe().then(success => {
  process.exit(success ? 0 : 1);
});

