import React, { useState, useRef, useEffect } from 'react';
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
  Image,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { charityCategories } from '../data/demoData';

const EditProfileScreen = ({ navigation }) => {
  const { user, updateProfile } = useAuth();
  const isCharity = user?.userType === 'charity';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [detectedLocation, setDetectedLocation] = useState(null);

  // Refs for inputs
  const nameInputRef = useRef(null);
  const countryInputRef = useRef(null);
  const bioInputRef = useRef(null);
  const missionInputRef = useRef(null);
  const websiteInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const addressInputRef = useRef(null);
  const foundedYearInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    country: '',
    bio: '',
    charityName: '',
    mission: '',
    website: '',
    phone: '',
    address: '',
    foundedYear: new Date().getFullYear(),
    category: 'Education'
  });

  // Initialize form data from user profile
  useEffect(() => {
    if (user) {
      if (isCharity) {
        setFormData({
          charityName: user.name || '',
          country: user.country || '',
          mission: user.mission || '',
          website: user.website || '',
          phone: user.phone || '',
          address: user.address || '',
          foundedYear: user.foundedYear || new Date().getFullYear(),
          category: user.category || 'Education'
        });
        // Set existing location if available
        if (user.location && user.location.latitude && user.location.longitude) {
          setLocationData({
            latitude: user.location.latitude,
            longitude: user.location.longitude,
            address: user.address || '',
            city: user.location.city || '',
            country: user.location.country || user.country || ''
          });
        }
      } else {
        setFormData({
          name: user.name || '',
          country: user.country || '',
          bio: user.bio || ''
        });
      }
      // Set existing profile image
      if (user.avatar) {
        setProfileImage(user.avatar);
      }
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const pickProfileImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to add a profile picture.');
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
      setLocationLoading(true);
      setLocationError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        Alert.alert('Permission Required', 'Please grant location permissions to use this feature.');
        setLocationLoading(false);
        return;
      }

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
        
        const locationInfo = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: locationString,
          city: address.city,
          region: address.region,
          country: address.country,
        };

        setDetectedLocation(locationInfo);
        setShowLocationPicker(true);
      } else {
        // If reverse geocoding fails, just use coordinates
        const locationInfo = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setDetectedLocation(locationInfo);
        setShowLocationPicker(true);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationError('Failed to get location');
      Alert.alert('Error', 'Failed to get location. You can enter it manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  const confirmLocation = () => {
    if (detectedLocation) {
      setLocationData(detectedLocation);
      setFormData(prev => ({
        ...prev,
        country: detectedLocation.country || prev.country,
        address: detectedLocation.address || prev.address
      }));
      setShowLocationPicker(false);
      setDetectedLocation(null);
    }
  };

  const handleSubmit = async () => {
    if (isCharity) {
      if (!formData.charityName.trim()) {
        Alert.alert('Error', 'Please enter a charity name.');
        return;
      }
      if (!formData.country.trim()) {
        Alert.alert('Error', 'Please enter a location.');
        return;
      }
      if (!formData.mission.trim()) {
        Alert.alert('Error', 'Please enter a mission statement.');
        return;
      }
    } else {
      if (!formData.name.trim()) {
        Alert.alert('Error', 'Please enter your name.');
        return;
      }
    }

    try {
      setSaving(true);

      const updateData = {
        avatarUrl: profileImage,
        location: locationData
      };

      if (isCharity) {
        updateData.charityName = formData.charityName;
        updateData.country = formData.country;
        updateData.mission = formData.mission;
        updateData.website = formData.website;
        updateData.phone = formData.phone;
        updateData.address = formData.address;
        updateData.foundedYear = formData.foundedYear;
        updateData.category = formData.category;
      } else {
        updateData.name = formData.name;
        updateData.country = formData.country;
        updateData.bio = formData.bio;
      }

      await updateProfile(updateData);
      
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundAccent} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#064E3B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Update your information</Text>
            </View>

            <View style={styles.form}>
              {/* Profile Picture Section */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{isCharity ? 'Logo' : 'Profile Picture'}</Text>
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
                    <Pressable onPress={() => nameInputRef.current?.focus()}>
                      <TextInput
                        ref={nameInputRef}
                        style={styles.input}
                        value={formData.charityName}
                        onChangeText={(value) => handleInputChange('charityName', value)}
                        placeholder="Enter charity name"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="words"
                      />
                    </Pressable>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Location *</Text>
                    <View style={styles.locationContainer}>
                      <Pressable 
                        style={styles.locationInput}
                        onPress={() => countryInputRef.current?.focus()}
                      >
                        <TextInput
                          ref={countryInputRef}
                          style={styles.input}
                          value={locationData?.address || formData.country}
                          onChangeText={(value) => handleInputChange('country', value)}
                          placeholder="e.g., Damascus, Syria or use location button"
                          placeholderTextColor="#9CA3AF"
                          autoCapitalize="words"
                        />
                      </Pressable>
                      <TouchableOpacity 
                        style={styles.locationButton}
                        onPress={pickLocation}
                        disabled={locationLoading}
                      >
                        {locationLoading ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Ionicons name="location" size={20} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    </View>
                    {locationData && (
                      <Text style={styles.locationInfo}>
                        📍 Location set: {locationData.address || `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`}
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
                        multiline={true}
                        numberOfLines={3}
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
                        keyboardType="url"
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
                        keyboardType="phone-pad"
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
                      />
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name *</Text>
                    <Pressable onPress={() => nameInputRef.current?.focus()}>
                      <TextInput
                        ref={nameInputRef}
                        style={styles.input}
                        value={formData.name}
                        onChangeText={(value) => handleInputChange('name', value)}
                        placeholder="Enter your full name"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="words"
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
                        multiline={true}
                        numberOfLines={3}
                      />
                    </Pressable>
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[styles.submitButton, (saving || loading) && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={saving || loading}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
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
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={charityCategories}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.categoryItem}
                  onPress={() => {
                    handleInputChange('category', item);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={styles.categoryText}>{item}</Text>
                  {formData.category === item && (
                    <Ionicons name="checkmark" size={20} color="#22C55E" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Location Confirmation Modal */}
      <Modal
        visible={showLocationPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Location</Text>
            {detectedLocation && (
              <View style={styles.locationConfirmContent}>
                <Text style={styles.locationConfirmText}>
                  {detectedLocation.address || `${detectedLocation.latitude.toFixed(4)}, ${detectedLocation.longitude.toFixed(4)}`}
                </Text>
                <View style={styles.locationConfirmButtons}>
                  <TouchableOpacity
                    style={[styles.confirmButton, styles.cancelButton]}
                    onPress={() => {
                      setShowLocationPicker(false);
                      setDetectedLocation(null);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmButton, styles.saveButton]}
                    onPress={confirmLocation}
                  >
                    <Text style={styles.saveButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
  backgroundAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: '#ECFDF5',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#064E3B',
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formHeader: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#064E3B',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
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
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  addPictureButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0FDF4',
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
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  locationInput: {
    flex: 1,
  },
  locationButton: {
    backgroundColor: '#22C55E',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    marginTop: 8,
    fontSize: 12,
    color: '#059669',
  },
  pickerButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#1F2937',
  },
  submitButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryText: {
    fontSize: 16,
    color: '#1F2937',
  },
  locationConfirmContent: {
    paddingVertical: 16,
  },
  locationConfirmText: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  locationConfirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  saveButton: {
    backgroundColor: '#22C55E',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditProfileScreen;

