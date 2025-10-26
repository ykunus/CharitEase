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
        <View style={styles.illustration}>
          <Ionicons name="people" size={80} color="#3B82F6" />
          <Text style={styles.illustrationText}>
            Join our community of changemakers
          </Text>
        </View>

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
            <Text style={styles.authButtonText}>Sign Up as Charity</Text>
            <Text style={styles.authButtonSubtext}>Create charity account</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.authButton, styles.adminButton]}
            onPress={() => navigation.navigate('CharityAdmin')}
          >
            <Ionicons name="shield" size={24} color="#FFFFFF" />
            <Text style={styles.authButtonText}>Charity Admin Login</Text>
            <Text style={styles.authButtonSubtext}>Access existing charity account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            New to CharitEase?{' '}
            <Text style={styles.footerLink}>Create an account</Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
    marginBottom: 40,
  },
  descriptionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  authOptions: {
    gap: 16,
    marginBottom: 40,
  },
  authButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  charityButton: {
    backgroundColor: '#22C55E',
  },
  adminButton: {
    backgroundColor: '#8B5CF6',
  },
  authButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  authButtonSubtext: {
    fontSize: 14,
    color: '#E5E7EB',
    textAlign: 'center',
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
