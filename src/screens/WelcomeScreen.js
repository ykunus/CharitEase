import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Ionicons name="heart" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.appName}>CharitEase</Text>
          <Text style={styles.tagline}>Connecting Hearts, Creating Change</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>

        <View style={styles.description}>
          <Text style={styles.descriptionTitle}>Make a Difference</Text>
          <Text style={styles.descriptionText}>
            Connect with verified charities, track your impact, and be part of meaningful change in your community.
          </Text>
        </View>

        {/* Auth Options */}
        <View style={styles.authOptions}>
          <TouchableOpacity 
            style={styles.authButton}
            onPress={() => navigation.navigate('SignIn', { userType: 'user' })}
          >
            <Ionicons name="person" size={24} color="#FFFFFF" />
            <Text style={styles.authButtonText}>Sign In as User</Text>
            <Text style={styles.authButtonSubtext}>Donate and support causes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.authButton, styles.charityButton]}
            onPress={() => navigation.navigate('SignIn', { userType: 'charity' })}
          >
            <Ionicons name="heart" size={24} color="#FFFFFF" />
            <Text style={styles.authButtonText}>Sign In as Charity</Text>
            <Text style={styles.authButtonSubtext}>Sign in or create charity account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {/* <Text style={styles.footerText}>
            New to CharitEase?{' '}
            <Text style={styles.footerLink}>Create an account</Text>
          </Text> */}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#22C55E',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  illustration: {
    alignItems: 'center',
    marginBottom: 40,
  },
  illustrationText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
  description: {
    marginBottom: 50,
    paddingHorizontal: 10,
  },
  descriptionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  descriptionText: {
    fontSize: 17,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '400',
  },
  authOptions: {
    gap: 20,
    marginBottom: 40,
  },
  authButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 24,
    paddingHorizontal: 28,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 0,
  },
  charityButton: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  authButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 10,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  authButtonSubtext: {
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 16,
    color: '#6B7280',
  },
  footerLink: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});

export default WelcomeScreen;
