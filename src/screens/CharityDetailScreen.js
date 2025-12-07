import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatNumber } from '../utils/formatters';
import DonationModal from '../components/DonationModal';

const { width } = Dimensions.get('window');

const CharityDetailScreen = ({ route }) => {
  const { charity: charityParam } = route.params;
  const { getCharityById, followedCharities, followCharity, makeDonation } = useAuth();
  const [donationModalVisible, setDonationModalVisible] = useState(false);
  
  const charity = getCharityById(charityParam.id) || charityParam;
  const isFollowing = followedCharities.includes(charity.id);

  const handleFollow = () => {
    followCharity(charity.id);
  };

  const handleDonate = async (amount, message) => {
    try {
      await makeDonation(charity.id, amount, message);
      setDonationModalVisible(false);
    } catch (error) {
      console.error('Donation failed:', error);
      // Error is already handled in makeDonation
    }
  };

  const renderImpactMetric = (label, value, icon, color) => (
    <View style={styles.impactMetric}>
      <View style={[styles.impactIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.impactValue}>{value}</Text>
      <Text style={styles.impactLabel}>{label}</Text>
    </View>
  );

  const renderActionButton = (title, icon, onPress, variant = 'primary') => (
    <TouchableOpacity
      style={[
        styles.actionButton,
        variant === 'secondary' && styles.actionButtonSecondary
      ]}
      onPress={onPress}
    >
      <Ionicons 
        name={icon} 
        size={20} 
        color={variant === 'primary' ? '#FFFFFF' : '#3B82F6'} 
      />
      <Text style={[
        styles.actionButtonText,
        variant === 'secondary' && styles.actionButtonTextSecondary
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Image source={{ uri: charity.coverImage }} style={styles.coverImage} />
          <View style={styles.heroOverlay}>
            <View style={styles.logoContainer}>
              <Image source={{ uri: charity.logo }} style={styles.logo} />
              {charity.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Header Info */}
        <View style={styles.headerInfo}>
          <View style={styles.charityHeader}>
            <View style={styles.charityTitle}>
              <Text style={styles.charityName}>{charity.name}</Text>
              {charity.verified && (
                <View style={styles.verifiedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
            <Text style={styles.charityCategory}>
              {charity.category} • {charity.country}
            </Text>
            <Text style={styles.charityFounded}>
              Founded in {charity.founded}
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatCurrency(charity.totalRaised)}</Text>
              <Text style={styles.statLabel}>Total Raised</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatNumber(charity.followers)}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {renderActionButton(
            isFollowing ? 'Following' : 'Follow',
            isFollowing ? 'checkmark' : 'add',
            handleFollow,
            isFollowing ? 'secondary' : 'primary'
          )}
          {renderActionButton(
            'Donate',
            'heart',
            () => setDonationModalVisible(true),
            'primary'
          )}
        </View>

        {/* Mission */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mission</Text>
          <Text style={styles.missionText}>{charity.mission}</Text>
        </View>

        {/* Impact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Impact</Text>
          <View style={styles.impactGrid}>
            {charity.impact && Object.entries(charity.impact).map(([key, value], index) => {
              const icons = ['people', 'school', 'medical', 'home'];
              const colors = ['#3B82F6', '#22C55E', '#EF4444', '#F59E0B'];
              const labels = {
                studentsSupported: 'Students',
                schoolsBuilt: 'Schools',
                teachersTrained: 'Teachers',
                booksDistributed: 'Books',
                patientsTreated: 'Patients',
                clinicsOperated: 'Clinics',
                medicalSuppliesDistributed: 'Supplies',
                surgeriesPerformed: 'Surgeries',
                jobsCreated: 'Jobs',
                homesRebuilt: 'Homes',
                communityCenters: 'Centers',
                familiesSupported: 'Families',
                womenEducated: 'Women',
                vocationalPrograms: 'Programs',
                scholarshipsAwarded: 'Scholarships',
                literacyClasses: 'Classes',
                familiesAided: 'Families',
                emergencySupplies: 'Supplies',
                shelterProvided: 'Shelters',
                mealsServed: 'Meals',
                youthMentored: 'Youth',
                skillsWorkshops: 'Workshops',
                leadershipPrograms: 'Programs',
                communityProjects: 'Projects'
              };
              
              return (
                <View key={key}>
                  {renderImpactMetric(
                    labels[key] || key,
                    formatNumber(value),
                    icons[index % icons.length],
                    colors[index % colors.length]
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Donation Modal */}
      <DonationModal
        visible={donationModalVisible}
        charity={charity}
        onClose={() => setDonationModalVisible(false)}
        onDonate={handleDonate}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  heroSection: {
    position: 'relative',
    height: 200,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: -30,
    left: 16,
  },
  logoContainer: {
    position: 'relative',
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerInfo: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  charityHeader: {
    marginBottom: 20,
  },
  charityTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  charityName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  verifiedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '600',
  },
  charityCategory: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  charityFounded: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
  },
  actionButtonSecondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonTextSecondary: {
    color: '#3B82F6',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  missionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  impactMetric: {
    width: (width - 64) / 2,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  impactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  impactValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  impactLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default CharityDetailScreen;
