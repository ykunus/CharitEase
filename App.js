import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <AppNavigator />
    </AuthProvider>
  );
}
