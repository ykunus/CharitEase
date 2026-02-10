# CharitEase Backend Setup

This backend server handles Stripe payment processing for the CharitEase mobile app.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Stripe account with API keys

## Setup Instructions

1. **Navigate to the backend folder:**
   ```bash
   cd backend-example
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Get your Stripe keys:**
   - Go to https://dashboard.stripe.com/test/apikeys
   - Copy your **Publishable key** (starts with `pk_test_`)
   - Copy your **Secret key** (starts with `sk_test_`)

4. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

5. **Edit the .env file with your Stripe secret key:**
   ```
   STRIPE_SECRET_KEY=sk_test_your_secret_key_here
   PORT=3000
   ```

6. **Update your mobile app:**
   - In `App.js`, replace `STRIPE_PUBLISHABLE_KEY` with your publishable key
   - In `DonationModal.js`, update `API_URL` to match your server (if running locally, use your computer's IP address)

7. **Start the server:**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

## Finding Your Computer's IP Address

### On macOS:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### On Windows:
```bash
ipconfig
```

Look for your local IP address (usually starts with 192.168.x.x or 10.x.x.x)

## Testing

The server will run on `http://localhost:3000` or `http://YOUR_IP:3000`

Test endpoint: `POST /create-payment-intent`

Example request:
```json
{
  "amount": 5000,
  "payment_method_types": ["card"]
}
```

## Security Notes

- Never commit your `.env` file to version control
- Use test keys during development
- Switch to live keys only in production
- Consider using environment variables in production deployment

## Troubleshooting

1. **"Network Request Failed"**: Check if the server is running and the IP address in your mobile app is correct
2. **Stripe errors**: Verify your API keys are correct and from the same Stripe account
3. **CORS issues**: The server includes CORS middleware to allow requests from your mobile app

## Production Deployment

For production, consider deploying to:
- Vercel
- Netlify Functions
- AWS Lambda
- Heroku
- DigitalOcean

Remember to use live Stripe keys and secure environment variable storage in production.