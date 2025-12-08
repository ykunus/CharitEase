# How to Start the Backend Server

## Quick Start

1. **Open Terminal** and navigate to the backend folder:
   ```bash
   cd backend-example
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

3. **You should see**:
   ```
   ✅ Server running on port 3000
   🔗 Health check: http://localhost:3000/health
   🏪 Stripe Connect enabled for marketplace payments
   🔑 Stripe configured with key: sk_test_51SF...
   ```

4. **Keep this terminal open** - the server needs to keep running!

5. **Test it** - Open in browser: http://localhost:3000/health
   - Should show: `{"status":"Server is running!","timestamp":"..."}`

## Troubleshooting

### "Port 3000 already in use"
- Another process is using port 3000
- Kill it: `lsof -ti:3000 | xargs kill`
- Or change PORT in .env file

### "Cannot find module 'stripe'"
- Install dependencies: `npm install`

### "Network Request Failed" in app
- Make sure server is running
- Check your IP address: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- Update `API_URL` in `DonationModal.js` if IP changed

## Your Current Setup

- ✅ Stripe key is configured correctly
- ✅ Server IP: `172.20.241.124:3000`
- ✅ App is configured to use this IP

## Next Steps

1. Start the server (see above)
2. Try making a donation in the app
3. Payment sheet should appear!

