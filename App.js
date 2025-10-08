import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

const STRIPE_PUBLISHABLE_KEY = 'pk_test_51SF8xh8jmzJcR5AJY1Nisy7FV29rax9ZJj85vrdf9DaQHCOP4NC5qzL41BS4Gx5eTkBHiG4lcSGhX44C8MGUPahH00dtDRTtgt'; // Replace with your actual Stripe publishable key

export default function App() {
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <AuthProvider>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />
        <AppNavigator />
      </AuthProvider>
    </StripeProvider>
  );
}
