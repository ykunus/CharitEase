import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const SignInScreen = ({ navigation, route }) => {
  const { signIn, signUp } = useAuth();
  const { userType = 'user' } = route.params || {};
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    country: '',
    confirmPassword: ''
  });

  // Refs for input focus
  const nameInputRef = useRef(null);
  const countryInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }

    if (isSignUp) {
      if (!formData.name || !formData.country) {
        Alert.alert('Error', 'Please fill in all required fields');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return false;
      }
      if (formData.password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          country: formData.country,
          userType
        });
        Alert.alert('Success', 'Account created successfully!');
      } else {
        await signIn({
          email: formData.email,
          password: formData.password
        });
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      country: '',
      confirmPassword: ''
    });
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            
            <View style={styles.titleContainer}>
              <Text style={styles.title}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
              <Text style={styles.subtitle}>
                {userType === 'charity' ? 'As a Charity' : 'As a User'}
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {isSignUp && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <Pressable onPress={() => nameInputRef.current?.focus()}>
                    <TextInput
                      ref={nameInputRef}
                      style={styles.input}
                      value={formData.name}
                      onChangeText={(value) => handleInputChange('name', value)}
                      placeholder="Enter your full name"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="words"
                      autoComplete="off"
                      textContentType="none"
                      spellCheck={false}
                      autoCorrect={false}
                      importantForAutofill="no"
                      autoFocus={true}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => countryInputRef.current?.focus()}
                    />
                  </Pressable>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Country</Text>
                  <Pressable onPress={() => countryInputRef.current?.focus()}>
                    <TextInput
                      ref={countryInputRef}
                      style={styles.input}
                      value={formData.country}
                      onChangeText={(value) => handleInputChange('country', value)}
                      placeholder="e.g., Syria, Lebanon, Afghanistan"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="words"
                      autoComplete="off"
                      textContentType="none"
                      spellCheck={false}
                      autoCorrect={false}
                      importantForAutofill="no"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => emailInputRef.current?.focus()}
                    />
                  </Pressable>
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <Pressable onPress={() => emailInputRef.current?.focus()}>
                <TextInput
                  ref={emailInputRef}
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  textContentType="none"
                  spellCheck={false}
                  importantForAutofill="no"
                  autoFocus={!isSignUp}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Secret Code</Text>
              <Pressable onPress={() => passwordInputRef.current?.focus()}>
                <TextInput
                  ref={passwordInputRef}
                  style={styles.input}
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  placeholder="Type your secret code"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoComplete="off"
                  textContentType="none"
                  spellCheck={false}
                  autoCorrect={false}
                  keyboardType="ascii-capable"
                  importantForAutofill="no"
                  dataDetectorTypes="none"
                  clearButtonMode="never"
                  enablesReturnKeyAutomatically={false}
                  returnKeyType={isSignUp ? "next" : "done"}
                  onSubmitEditing={isSignUp ? () => confirmPasswordInputRef.current?.focus() : handleSubmit}
                />
              </Pressable>
            </View>

            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Secret Code</Text>
                <Pressable onPress={() => confirmPasswordInputRef.current?.focus()}>
                  <TextInput
                    ref={confirmPasswordInputRef}
                    style={styles.input}
                    value={formData.confirmPassword}
                    onChangeText={(value) => handleInputChange('confirmPassword', value)}
                    placeholder="Confirm your secret code"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    autoComplete="off"
                    textContentType="none"
                    spellCheck={false}
                    autoCorrect={false}
                    keyboardType="ascii-capable"
                    importantForAutofill="no"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                </Pressable>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toggleButton} onPress={toggleMode}>
              <Text style={styles.toggleButtonText}>
                {isSignUp 
                  ? 'Already have an account? Sign In' 
                  : "Don't have an account? Sign Up"
                }
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  toggleButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
});

export default SignInScreen;
