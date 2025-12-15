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
  FlatList,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { charityCategories } from '../data/demoData';

const SignInScreen = ({ navigation, route }) => {
  const { signIn, signUp } = useAuth();
  const { userType = 'user' } = route.params || {};
  const isCharity = userType === 'charity';

  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [geocodingAddress, setGeocodingAddress] = useState(false);
  const [formData, setFormData] = useState({
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
  const locationInputRef = useRef(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }

    if (isSignUp) {
      if (isCharity) {
        if (!formData.charityName || !formData.mission) {
          Alert.alert('Error', 'Please fill in all required fields for charity registration');
          return false;
        }
        
        // Validate location/address for charities
        const addressToValidate = locationData?.address || formData.address;
        if (!addressToValidate || addressToValidate.trim().length === 0) {
          Alert.alert(
            'Location Required',
            'Please enter your charity\'s address and tap "Find Location" to verify it.\n\nExample: Newton, Massachusetts, United States'
          );
          locationInputRef.current?.focus();
          return false;
        }
        
        // Check if address has been geocoded (has coordinates)
        if (!locationData || !locationData.latitude || !locationData.longitude) {
          Alert.alert(
            'Location Not Verified',
            'Please tap "Find Location" to verify your address and get coordinates. This is required for location-based features.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Verify Now', onPress: async () => {
                const result = await geocodeAddress(addressToValidate);
                if (!result) {
                  // Geocoding failed, but allow submission if user wants
                  Alert.alert(
                    'Continue Anyway?',
                    'We couldn\'t verify your address. You can continue, but location-based features may not work. Would you like to try a different address?',
                    [
                      { text: 'Try Different Address', onPress: () => locationInputRef.current?.focus() },
                      { text: 'Continue Anyway', style: 'destructive', onPress: () => {
                        // Allow submission without coordinates
                        setFormData(prev => ({ ...prev }));
                      }}
                    ]
                  );
                }
              }}
            ]
          );
          return false;
        }
        
        const addressValidation = validateAddress(addressToValidate);
        if (!addressValidation.valid) {
          Alert.alert('Invalid Address', addressValidation.message);
          locationInputRef.current?.focus();
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
          name: isCharity ? formData.charityName : formData.name,
          country: formData.country,
          userType,
          bio: formData.bio,
          avatarUrl: profileImage || null
        };

        if (isCharity) {
          signUpData.charityName = formData.charityName;
          signUpData.mission = formData.mission;
          signUpData.website = formData.website;
          signUpData.phone = formData.phone;
          signUpData.address = formData.address;
          signUpData.foundedYear = formData.foundedYear;
          signUpData.category = formData.category;
          
          // Add location data if available
          // If locationData exists, use it; otherwise create locationData from formData.address if available
          if (locationData) {
            signUpData.location = {
              ...locationData,
              address: locationData.address || formData.address
            };
          } else if (formData.address) {
            // If user entered address manually but didn't use location button,
            // create locationData with just the address (no coordinates)
            signUpData.location = {
              address: formData.address
            };
          }
        }

        await signUp(signUpData);
        Alert.alert('Success', 'Account created successfully!');
      } else {
        await signIn({
          email: formData.email,
          password: formData.password,
          expectedUserType: userType // Pass the expected user type (either 'user' or 'charity')
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
    setProfileImage(null);
    setLocationData(null);
  };

  const pickProfileImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your photos to set a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removeProfileImage = () => {
    setProfileImage(null);
  };

  const pickLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'We need access to your location to set your charity\'s location. You can also enter it manually.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Enter Manually', onPress: () => {
              Alert.alert(
                'Enter Address',
                'Please enter a complete address in the format:\n\nCity, Region/State, Country\n\nExample: Damascus, Damascus Governorate, Syria',
                [
                  { text: 'OK', onPress: () => locationInputRef.current?.focus() }
                ]
              );
            }}
          ]
        );
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode to get address
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode.length > 0) {
        const address = geocode[0];
        const locationString = `${address.city || ''}${address.region ? ', ' + address.region : ''}${address.country ? ', ' + address.country : ''}`.trim();
        
        if (locationString && address.city && address.country) {
        setLocationData({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: locationString,
          city: address.city,
          region: address.region,
          country: address.country,
        });
        
        setFormData(prev => ({
          ...prev,
          country: address.country || prev.country,
          address: locationString || prev.address
        }));
          
          Alert.alert('Success', `Location set: ${locationString}`);
      } else {
          // If reverse geocoding doesn't provide complete address, ask for manual entry
          Alert.alert(
            'Location Found, Address Needed',
            `We found your coordinates (${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}), but couldn't get a complete address.\n\nPlease enter a complete address manually in the format:\n\nCity, Region/State, Country\n\nExample: Damascus, Damascus Governorate, Syria`,
            [
              { text: 'OK', onPress: () => {
        setLocationData({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
                addressInputRef.current?.focus();
              }}
            ]
          );
        }
      } else {
        // If reverse geocoding fails, ask for manual entry
        Alert.alert(
          'Location Found, Address Needed',
          `We found your coordinates (${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}), but couldn't get an address.\n\nPlease enter a complete address manually in the format:\n\nCity, Region/State, Country\n\nExample: Damascus, Damascus Governorate, Syria`,
          [
            { text: 'OK', onPress: () => {
              setLocationData({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              });
              locationInputRef.current?.focus();
            }}
          ]
        );
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error',
        'Failed to get location automatically. Please enter your address manually.\n\nFormat: City, Region/State, Country\n\nExample: Damascus, Damascus Governorate, Syria',
        [
          { text: 'OK', onPress: () => locationInputRef.current?.focus() }
        ]
      );
    }
  };

  const geocodeAddress = async (address) => {
    if (!address || address.trim().length === 0) {
      Alert.alert('Error', 'Please enter an address to geocode');
      return null;
    }

    // Normalize common typos and abbreviations
    let normalizedAddress = address.trim();
    
    // Fix common country name typos
    const countryFixes = {
      'untied states': 'United States',
      'united state': 'United States',
      'usa': 'United States',
      'us': 'United States',
    };
    
    // Fix common state abbreviations (expand them)
    const stateExpansions = {
      'ma': 'Massachusetts',
      'ca': 'California',
      'ny': 'New York',
      'tx': 'Texas',
      'fl': 'Florida',
      'il': 'Illinois',
      'pa': 'Pennsylvania',
      'oh': 'Ohio',
      'ga': 'Georgia',
      'nc': 'North Carolina',
      'mi': 'Michigan',
      'nj': 'New Jersey',
      'va': 'Virginia',
      'wa': 'Washington',
      'az': 'Arizona',
      'tn': 'Tennessee',
      'in': 'Indiana',
      'mo': 'Missouri',
      'md': 'Maryland',
      'wi': 'Wisconsin',
      'co': 'Colorado',
      'mn': 'Minnesota',
      'sc': 'South Carolina',
      'al': 'Alabama',
      'la': 'Louisiana',
      'ky': 'Kentucky',
      'or': 'Oregon',
      'ok': 'Oklahoma',
      'ct': 'Connecticut',
      'ut': 'Utah',
      'ia': 'Iowa',
      'nv': 'Nevada',
      'ar': 'Arkansas',
      'ms': 'Mississippi',
      'ks': 'Kansas',
      'nm': 'New Mexico',
      'ne': 'Nebraska',
      'wv': 'West Virginia',
      'id': 'Idaho',
      'hi': 'Hawaii',
      'nh': 'New Hampshire',
      'me': 'Maine',
      'mt': 'Montana',
      'ri': 'Rhode Island',
      'de': 'Delaware',
      'sd': 'South Dakota',
      'nd': 'North Dakota',
      'ak': 'Alaska',
      'vt': 'Vermont',
      'wy': 'Wyoming',
      'dc': 'District of Columbia',
    };
    
    // Apply fixes
    Object.entries(countryFixes).forEach(([wrong, correct]) => {
      normalizedAddress = normalizedAddress.replace(new RegExp(wrong, 'gi'), correct);
    });
    
    // Try to expand state abbreviations (look for patterns like ", MA," or ", Ma,")
    Object.entries(stateExpansions).forEach(([abbr, full]) => {
      const regex = new RegExp(`,\\s*${abbr}\\s*,`, 'gi');
      normalizedAddress = normalizedAddress.replace(regex, `, ${full},`);
    });
    
    // If address was modified, show a message
    if (normalizedAddress !== address) {
      console.log('📍 Normalized address:', address, '→', normalizedAddress);
    }

    setGeocodingAddress(true);
    try {
      // Use Expo Location's forward geocoding to convert address to coordinates
      const geocodeResults = await Location.geocodeAsync(normalizedAddress);
      
      if (geocodeResults && geocodeResults.length > 0) {
        const result = geocodeResults[0];
        const { latitude, longitude } = result;
        
        // Reverse geocode to get a formatted address
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        
        let formattedAddress = normalizedAddress;
        let city = null;
        let region = null;
        let country = null;
        
        if (reverseGeocode && reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];
          city = addr.city;
          region = addr.region;
          country = addr.country;
          
          // Build formatted address from reverse geocode
          const addressParts = [];
          if (addr.city) addressParts.push(addr.city);
          if (addr.region) addressParts.push(addr.region);
          if (addr.country) addressParts.push(addr.country);
          formattedAddress = addressParts.join(', ');
        }
        
        const locationInfo = {
          latitude,
          longitude,
          address: formattedAddress,
          city: city,
          region: region,
          country: country,
        };
        
        setLocationData(locationInfo);
        setFormData(prev => ({
          ...prev,
          address: formattedAddress,
          country: country || prev.country
        }));
        
        Alert.alert('Success', `Address found and location set:\n${formattedAddress}`);
        return locationInfo;
      } else {
        // Try with original address if normalized version failed
        if (normalizedAddress !== address) {
          console.log('🔄 Trying original address after normalization failed...');
          const retryResults = await Location.geocodeAsync(address);
          if (retryResults && retryResults.length > 0) {
            const result = retryResults[0];
            const { latitude, longitude } = result;
            
            const reverseGeocode = await Location.reverseGeocodeAsync({
              latitude,
              longitude,
            });
            
            let formattedAddress = address;
            if (reverseGeocode && reverseGeocode.length > 0) {
              const addr = reverseGeocode[0];
              const addressParts = [];
              if (addr.city) addressParts.push(addr.city);
              if (addr.region) addressParts.push(addr.region);
              if (addr.country) addressParts.push(addr.country);
              formattedAddress = addressParts.join(', ');
            }
            
            const locationInfo = {
              latitude,
              longitude,
              address: formattedAddress,
              city: reverseGeocode?.[0]?.city,
              region: reverseGeocode?.[0]?.region,
              country: reverseGeocode?.[0]?.country,
            };
            
            setLocationData(locationInfo);
            setFormData(prev => ({
              ...prev,
              address: formattedAddress,
              country: reverseGeocode?.[0]?.country || prev.country
            }));
            
            Alert.alert('Success', `Address found and location set:\n${formattedAddress}`);
            return locationInfo;
          }
        }
        
        Alert.alert(
          'Address Not Found',
          'We couldn\'t find that address. Please try:\n\n• Using a more complete address\n• Including city, state/region, and country\n• Checking for spelling errors\n• Using full state names (e.g., "Massachusetts" instead of "MA")\n\nExample: Newton, Massachusetts, United States'
        );
        return null;
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      Alert.alert(
        'Geocoding Failed',
        'We couldn\'t process that address. Please try:\n\n• Using a more complete address\n• Including city, state/region, and country\n• Checking your internet connection\n• Using full state names\n\nExample: Newton, Massachusetts, United States'
      );
      return null;
    } finally {
      setGeocodingAddress(false);
    }
  };

  const validateAddress = (address) => {
    if (!address || address.trim().length === 0) {
      return { valid: false, message: 'Address cannot be empty' };
    }
    
    // Basic validation - at least 3 characters
    if (address.trim().length < 3) {
      return { 
        valid: false, 
        message: 'Please enter a more complete address' 
      };
    }
    
    return { valid: true };
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
  };

  const heroTitle = isSignUp ? 'Join CharitEase' : 'Welcome back';
  const heroSubtitle = isCharity
    ? 'Showcase your mission and meet people who care.'
    : 'Discover trusted charities and track the impact you fund.';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundAccent} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#064E3B" />
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <View style={styles.heroBadge}>
                <Ionicons name={isCharity ? 'ribbon' : 'leaf'} size={16} color="#065F46" />
                <Text style={styles.heroBadgeText}>
                  {isCharity ? 'Trusted charities' : 'Kindness starts here'}
                </Text>
              </View>
              <Text style={styles.title}>{heroTitle}</Text>
              <Text style={styles.subtitle}>{heroSubtitle}</Text>
              <View style={styles.heroStats}>
                <View style={styles.statPill}>
                  <Ionicons name="shield-checkmark" size={16} color="#065F46" />
                  <Text style={styles.statPillText}>Secure sign in</Text>
                </View>
                <View style={[styles.statPill, styles.statPillMargin]}>
                  <Ionicons name="heart" size={16} color="#065F46" />
                  <Text style={styles.statPillText}>Support that matters</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>{isSignUp ? 'Let\'s get you set up' : 'Access your account'}</Text>
              <View style={styles.formChip}>
                <Ionicons name={isCharity ? 'people' : 'sparkles'} size={14} color="#065F46" />
                <Text style={styles.formChipText}>{isCharity ? 'For charities' : 'For supporters'}</Text>
              </View>
            </View>

            <View style={styles.form}>
              {isSignUp && (
                <>
                  {/* Profile Picture Section */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Profile Picture</Text>
                    <View style={styles.profilePictureContainer}>
                      {profileImage ? (
                        <View style={styles.profileImageWrapper}>
                          <Image source={{ uri: profileImage }} style={styles.profileImage} />
                          <TouchableOpacity 
                            style={styles.removeImageButton}
                            onPress={removeProfileImage}
                          >
                            <Ionicons name="close-circle" size={24} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity 
                          style={styles.addPictureButton}
                          onPress={pickProfileImage}
                        >
                          <Ionicons name="camera" size={32} color="#065F46" />
                          <Text style={styles.addPictureText}>
                            {isCharity ? 'Add Logo' : 'Add Photo'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {isCharity ? (
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
                        <Text style={styles.label}>Location *</Text>
                        <Text style={styles.locationHint}>
                          Enter your charity's address (e.g., "Newton, Massachusetts, United States") and tap "Find Location" to verify
                        </Text>
                        <View style={styles.locationContainer}>
                          <Pressable 
                            style={styles.locationInput}
                            onPress={() => locationInputRef.current?.focus()}
                          >
                            <TextInput
                              ref={locationInputRef}
                              style={styles.input}
                              value={formData.address}
                              onChangeText={(value) => {
                                handleInputChange('address', value);
                                // Clear location data if user manually edits address
                                if (locationData && value !== locationData.address) {
                                  setLocationData(null);
                                }
                              }}
                              placeholder="e.g., Newton, Massachusetts, United States"
                              placeholderTextColor="#9CA3AF"
                              autoCapitalize="words"
                              autoComplete="off"
                              textContentType="none"
                              spellCheck={true}
                              autoCorrect={true}
                              importantForAutofill="no"
                              returnKeyType="done"
                              blurOnSubmit={false}
                              onSubmitEditing={async () => {
                                const address = formData.address.trim();
                                if (address.length > 0) {
                                  await geocodeAddress(address);
                                }
                              }}
                            />
                          </Pressable>
                          <TouchableOpacity 
                            style={styles.locationButton}
                            onPress={pickLocation}
                            disabled={geocodingAddress}
                          >
                            <Ionicons name="location" size={20} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.geocodeButtonContainer}>
                          <TouchableOpacity
                            style={[styles.geocodeButton, geocodingAddress && styles.geocodeButtonDisabled]}
                            onPress={async () => {
                              const address = formData.address.trim();
                              if (address.length === 0) {
                                Alert.alert('No Address', 'Please enter an address first');
                                locationInputRef.current?.focus();
                                return;
                              }
                              await geocodeAddress(address);
                            }}
                            disabled={geocodingAddress}
                          >
                            {geocodingAddress ? (
                              <>
                                <Ionicons name="hourglass" size={16} color="#FFFFFF" />
                                <Text style={styles.geocodeButtonText}>Finding...</Text>
                              </>
                            ) : (
                              <>
                                <Ionicons name="search" size={16} color="#FFFFFF" />
                                <Text style={styles.geocodeButtonText}>Find Location</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                        {locationData && locationData.latitude && locationData.longitude && (
                          <Text style={styles.locationInfo}>
                            ✅ Location verified: {locationData.address || `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`}
                          </Text>
                        )}
                        {locationData && (!locationData.latitude || !locationData.longitude) && (
                          <Text style={styles.locationWarning}>
                            ⚠️ Address entered but not verified. Tap "Find Location" to get coordinates.
                          </Text>
                        )}
                        {!locationData && formData.address && (
                          <Text style={styles.locationHint}>
                            💡 Tap "Find Location" to verify your address and get coordinates
                          </Text>
                        )}
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Category *</Text>
                        <TouchableOpacity 
                          style={styles.pickerButton}
                          onPress={() => setShowCategoryPicker(true)}
                        >
                          <Text style={styles.pickerButtonText}>{formData.category}</Text>
                          <Ionicons name="chevron-down" size={20} color="#047857" />
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
                            placeholder="Share your mission, goals, and impact"
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
                        <Text style={styles.label}>Additional Address Details (Optional)</Text>
                        <Text style={styles.locationHint}>
                          Street address or additional location details (if different from location above)
                        </Text>
                        <Pressable onPress={() => addressInputRef.current?.focus()}>
                          <TextInput
                            ref={addressInputRef}
                            style={styles.input}
                            value={formData.address}
                            onChangeText={(value) => handleInputChange('address', value)}
                            placeholder="e.g., 123 Main Street, Building A"
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
                    returnKeyType={isSignUp ? 'next' : 'done'}
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
                    : 'New here? Create an account'
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
                    <Ionicons name="checkmark" size={20} color="#059669" />
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
    backgroundColor: '#F5FBF7',
  },
  backgroundAccent: {
    position: 'absolute',
    top: -120,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 160,
    backgroundColor: '#D1FAE5',
    opacity: 0.6,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#ECFDF3',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#064E3B',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#047857',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroBadgeText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  heroStats: {
    flexDirection: 'row',
    marginTop: 12,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  statPillMargin: {
    marginLeft: 8,
  },
  statPillText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#064E3B',
  },
  formChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  formChipText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#064E3B',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleButtonText: {
    fontSize: 16,
    color: '#065F46',
    fontWeight: '600',
  },
  pickerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#064E3B',
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
    backgroundColor: '#ECFDF3',
  },
  categoryItemText: {
    fontSize: 16,
    color: '#1F2937',
  },
  categoryItemTextSelected: {
    color: '#047857',
    fontWeight: '700',
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#D1FAE5',
  },
  addPictureButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ECFDF3',
    borderWidth: 2,
    borderColor: '#D1FAE5',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPictureText: {
    marginTop: 8,
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationInput: {
    flex: 1,
  },
  locationButton: {
    backgroundColor: '#10B981',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    marginTop: 8,
    fontSize: 12,
    color: '#047857',
    fontStyle: 'italic',
  },
  locationHint: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  locationWarning: {
    color: '#EF4444',
    fontWeight: '600',
  },
  geocodeButtonContainer: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  geocodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  geocodeButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  geocodeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SignInScreen;
