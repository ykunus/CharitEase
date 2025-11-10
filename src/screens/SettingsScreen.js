import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Switch,
  Alert,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const SettingsScreen = ({ navigation }) => {
  const { user, signOut } = useAuth();
  const isCharity = user?.userType === 'charity';
  
  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [showDonations, setShowDonations] = useState(true);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
          }
        }
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing feature coming soon!');
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'Password change feature coming soon!');
  };

  const handlePrivacySettings = () => {
    Alert.alert('Privacy Settings', 'Advanced privacy settings coming soon!');
  };

  const handleBlockedAccounts = () => {
    Alert.alert('Blocked Accounts', 'Blocked accounts management coming soon!');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Account Deletion', 'Account deletion feature coming soon!');
          }
        }
      ]
    );
  };

  // Charity-specific handlers
  const handleEditWebsite = () => {
    Alert.alert('Edit Website', 'Website editing coming soon!');
  };

  const handleDonationSettings = () => {
    Alert.alert('Donation Settings', 'Configure payment methods and donation options.');
  };

  const handleVerificationStatus = () => {
    Alert.alert(
      'Verification Status',
      user.verified 
        ? 'Your charity is verified ✅'
        : 'Your charity verification is pending. Our team will review your application soon.'
    );
  };

  const renderSectionHeader = (title) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const renderSettingItem = ({ icon, label, onPress, rightContent, destructive = false }) => (
    <TouchableOpacity 
      style={styles.settingItem}
      onPress={onPress}
    >
      <View style={styles.settingLeft}>
        <Ionicons 
          name={icon} 
          size={22} 
          color={destructive ? '#EF4444' : '#6B7280'} 
        />
        <Text style={[styles.settingLabel, destructive && styles.destructiveText]}>
          {label}
        </Text>
      </View>
      {rightContent || <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
    </TouchableOpacity>
  );

  const renderToggleItem = ({ icon, label, value, onValueChange, description }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={22} color="#6B7280" />
        <View style={styles.toggleTextContainer}>
          <Text style={styles.settingLabel}>{label}</Text>
          {description && (
            <Text style={styles.settingDescription}>{description}</Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#D1D5DB', true: isCharity ? '#86EFAC' : '#93C5FD' }}
        thumbColor={value ? (isCharity ? '#22C55E' : '#3B82F6') : '#F3F4F6'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        {renderSectionHeader('Account')}
        {renderSettingItem({
          icon: 'person-outline',
          label: 'Edit Profile',
          onPress: handleEditProfile
        })}
        {renderSettingItem({
          icon: 'lock-closed-outline',
          label: 'Change Password',
          onPress: handleChangePassword
        })}

        {/* Charity-specific settings */}
        {isCharity && (
          <>
            {renderSectionHeader('Charity Information')}
            {renderSettingItem({
              icon: 'globe-outline',
              label: 'Website',
              onPress: handleEditWebsite,
              rightContent: (
                <View style={styles.rightTextContainer}>
                  <Text style={styles.rightText} numberOfLines={1}>
                    {user.website || 'Add website'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              )
            })}
            {renderSettingItem({
              icon: 'card-outline',
              label: 'Donation Settings',
              onPress: handleDonationSettings
            })}
            {renderSettingItem({
              icon: user.verified ? 'checkmark-circle' : 'time-outline',
              label: 'Verification Status',
              onPress: handleVerificationStatus,
              rightContent: (
                <View style={styles.rightTextContainer}>
                  <Text style={[styles.rightText, user.verified && styles.verifiedText]}>
                    {user.verified ? 'Verified' : 'Pending'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              )
            })}
          </>
        )}

        {/* Privacy & Content */}
        {renderSectionHeader('Privacy & Content')}
        {renderSettingItem({
          icon: 'shield-outline',
          label: 'Privacy Settings',
          onPress: handlePrivacySettings
        })}
        {renderToggleItem({
          icon: 'eye-outline',
          label: isCharity ? 'Show Donation Stats' : 'Show Donations Publicly',
          value: showDonations,
          onValueChange: setShowDonations,
          description: isCharity 
            ? 'Display total raised and donor count on your profile'
            : 'Let others see your donation activity'
        })}
        {renderSettingItem({
          icon: 'heart-outline',
          label: 'Liked Posts',
          onPress: () => Alert.alert('Liked Posts', 'View your liked posts - Coming soon!')
        })}
        {renderSettingItem({
          icon: 'bookmark-outline',
          label: 'Saved Content',
          onPress: () => Alert.alert('Saved Content', 'View your saved content - Coming soon!')
        })}
        {renderSettingItem({
          icon: 'ban-outline',
          label: 'Blocked Accounts',
          onPress: handleBlockedAccounts
        })}

        {/* Notifications */}
        {renderSectionHeader('Notifications')}
        {renderToggleItem({
          icon: 'notifications-outline',
          label: 'Push Notifications',
          value: notificationsEnabled,
          onValueChange: setNotificationsEnabled,
          description: 'Get notified about new posts and updates'
        })}
        {renderToggleItem({
          icon: 'mail-outline',
          label: 'Email Updates',
          value: emailUpdates,
          onValueChange: setEmailUpdates,
          description: 'Receive weekly summaries and important updates'
        })}

        {/* Support & About */}
        {renderSectionHeader('Support & About')}
        {renderSettingItem({
          icon: 'help-circle-outline',
          label: 'Help Center',
          onPress: () => Alert.alert('Help Center', 'Help documentation coming soon!')
        })}
        {renderSettingItem({
          icon: 'chatbubble-outline',
          label: 'Contact Support',
          onPress: () => Alert.alert('Contact Support', 'Support contact feature coming soon!')
        })}
        {renderSettingItem({
          icon: 'document-text-outline',
          label: 'Terms & Privacy',
          onPress: () => Alert.alert('Terms & Privacy', 'Legal documents coming soon!')
        })}
        {renderSettingItem({
          icon: 'information-circle-outline',
          label: 'About CharitEase',
          onPress: () => Alert.alert('CharitEase', 'Version 1.0.0\n\nMaking charitable giving easier and more transparent.')
        })}

        {/* Danger Zone */}
        {renderSectionHeader('Account Actions')}
        {renderSettingItem({
          icon: 'log-out-outline',
          label: 'Sign Out',
          onPress: handleSignOut,
          destructive: true
        })}
        {renderSettingItem({
          icon: 'trash-outline',
          label: 'Delete Account',
          onPress: handleDeleteAccount,
          destructive: true
        })}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  destructiveText: {
    color: '#EF4444',
  },
  rightTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 180,
  },
  rightText: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  verifiedText: {
    color: '#22C55E',
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default SettingsScreen;



