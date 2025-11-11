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
  Pressable,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { charityCategories } from '../data/demoData';

const SignInScreen = ({ navigation, route }) => {
  const { signIn, signUp } = useAuth();
  const { userType = 'user' } = route.params || {};
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    country: '',
    confirmPassword: '',
    bio: '',
    // Charity-specific fields
    charityName: '',
    mission: '',
    website: '',
    phone: '',
    address: '',
    foundedYear: new Date().getFullYear(),
    category: 'Education'
  });

  // Refs for input focus
  const nameInputRef = useRef(null);
  const countryInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);
  const bioInputRef = useRef(null);
  const charityNameInputRef = useRef(null);
  const missionInputRef = useRef(null);
  const websiteInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const addressInputRef = useRef(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }

    if (isSignUp) {
      if (userType === 'charity') {
        if (!formData.charityName || !formData.country || !formData.mission) {
          Alert.alert('Error', 'Please fill in all required fields for charity registration');
          return false;
        }
      } else {
        if (!formData.name || !formData.country) {
          Alert.alert('Error', 'Please fill in all required fields');
          return false;
        }
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
        const signUpData = {
          email: formData.email,
          password: formData.password,
          name: userType === 'charity' ? formData.charityName : formData.name,
          country: formData.country,
          userType,
          bio: formData.bio
        };

        // Add charity-specific fields
        if (userType === 'charity') {
          signUpData.charityName = formData.charityName;
          signUpData.mission = formData.mission;
          signUpData.website = formData.website;
          signUpData.phone = formData.phone;
          signUpData.address = formData.address;
          signUpData.foundedYear = formData.foundedYear;
          signUpData.category = formData.category;
        }

        await signUp(signUpData);
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
      confirmPassword: '',
      bio: '',
      charityName: '',
      mission: '',
      website: '',
      phone: '',
      address: '',
      foundedYear: new Date().getFullYear(),
      category: 'Education'
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
                {userType === 'charity' ? (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Charity Name *</Text>
                      <Pressable onPress={() => charityNameInputRef.current?.focus()}>
                        <TextInput
                          ref={charityNameInputRef}
                          style={styles.input}
                          value={formData.charityName}
                          onChangeText={(value) => handleInputChange('charityName', value)}
                          placeholder="Enter charity name"
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
                      <Text style={styles.label}>Country *</Text>
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
                          onSubmitEditing={() => missionInputRef.current?.focus()}
                        />
                      </Pressable>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Category *</Text>
                      <TouchableOpacity 
                        style={styles.pickerButton}
                        onPress={() => setShowCategoryPicker(true)}
                      >
                        <Text style={styles.pickerButtonText}>{formData.category}</Text>
                        <Ionicons name="chevron-down" size={20} color="#6B7280" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Mission Statement *</Text>
                      <Pressable onPress={() => missionInputRef.current?.focus()}>
                        <TextInput
                          ref={missionInputRef}
                          style={[styles.input, styles.textArea]}
                          value={formData.mission}
                          onChangeText={(value) => handleInputChange('mission', value)}
                          placeholder="Describe your charity's mission and goals"
                          placeholderTextColor="#9CA3AF"
                          autoCapitalize="sentences"
                          autoComplete="off"
                          textContentType="none"
                          spellCheck={false}
                          autoCorrect={false}
                          importantForAutofill="no"
                          multiline={true}
                          numberOfLines={3}
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onSubmitEditing={() => websiteInputRef.current?.focus()}
                        />
                      </Pressable>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Website</Text>
                      <Pressable onPress={() => websiteInputRef.current?.focus()}>
                        <TextInput
                          ref={websiteInputRef}
                          style={styles.input}
                          value={formData.website}
                          onChangeText={(value) => handleInputChange('website', value)}
                          placeholder="https://your-charity.org"
                          placeholderTextColor="#9CA3AF"
                          autoCapitalize="none"
                          autoComplete="off"
                          textContentType="none"
                          spellCheck={false}
                          autoCorrect={false}
                          importantForAutofill="no"
                          keyboardType="url"
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onSubmitEditing={() => phoneInputRef.current?.focus()}
                        />
                      </Pressable>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Phone Number</Text>
                      <Pressable onPress={() => phoneInputRef.current?.focus()}>
                        <TextInput
                          ref={phoneInputRef}
                          style={styles.input}
                          value={formData.phone}
                          onChangeText={(value) => handleInputChange('phone', value)}
                          placeholder="+1 (555) 123-4567"
                          placeholderTextColor="#9CA3AF"
                          autoComplete="off"
                          textContentType="none"
                          spellCheck={false}
                          autoCorrect={false}
                          importantForAutofill="no"
                          keyboardType="phone-pad"
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onSubmitEditing={() => addressInputRef.current?.focus()}
                        />
                      </Pressable>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Address</Text>
                      <Pressable onPress={() => addressInputRef.current?.focus()}>
                        <TextInput
                          ref={addressInputRef}
                          style={styles.input}
                          value={formData.address}
                          onChangeText={(value) => handleInputChange('address', value)}
                          placeholder="Enter your charity's address"
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
                ) : (
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
                          onSubmitEditing={() => bioInputRef.current?.focus()}
                        />
                      </Pressable>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Bio</Text>
                      <Pressable onPress={() => bioInputRef.current?.focus()}>
                        <TextInput
                          ref={bioInputRef}
                          style={[styles.input, styles.textArea]}
                          value={formData.bio}
                          onChangeText={(value) => handleInputChange('bio', value)}
                          placeholder="Tell us about yourself (optional)"
                          placeholderTextColor="#9CA3AF"
                          autoCapitalize="sentences"
                          autoComplete="off"
                          textContentType="none"
                          spellCheck={false}
                          autoCorrect={false}
                          importantForAutofill="no"
                          multiline={true}
                          numberOfLines={3}
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onSubmitEditing={() => emailInputRef.current?.focus()}
                        />
                      </Pressable>
                    </View>
                  </>
                )}
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

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={charityCategories}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    formData.category === item && styles.categoryItemSelected
                  ]}
                  onPress={() => {
                    handleInputChange('category', item);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryItemText,
                      formData.category === item && styles.categoryItemTextSelected
                    ]}
                  >
                    {item}
                  </Text>
                  {formData.category === item && (
                    <Ionicons name="checkmark" size={20} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
  pickerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#1F2937',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  categoryItemText: {
    fontSize: 16,
    color: '#1F2937',
  },
  categoryItemTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});

export default SignInScreen;
