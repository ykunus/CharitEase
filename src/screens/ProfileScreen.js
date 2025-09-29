import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const ProfileScreen = ({ navigation }) => {
  const { user, donations, getCharityById, getFollowedCharitiesData } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const followedCharities = getFollowedCharitiesData();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  const handleCharityPress = (charity) => {
    navigation.navigate('Charities', {
      screen: 'CharityDetail',
      params: { charity }
    });
  };

  const handleBrowseCharities = () => {
    navigation.navigate('Charities');
  };

  const renderStatsCard = (title, value, icon, color) => (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
      <View style={styles.statsIconContainer}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statsContent}>
        <Text style={styles.statsValue}>{value}</Text>
        <Text style={styles.statsLabel}>{title}</Text>
      </View>
    </View>
  );

  const renderFollowedCharity = ({ item: charity }) => (
    <TouchableOpacity
      style={styles.charityItem}
      onPress={() => handleCharityPress(charity)}
    >
      <Image source={{ uri: charity.logo }} style={styles.charityLogo} />
      <View style={styles.charityInfo}>
        <Text style={styles.charityName} numberOfLines={1}>
          {charity.name}
        </Text>
        <Text style={styles.charityCategory}>
          {charity.category} • {charity.country}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#6B7280" />
    </TouchableOpacity>
  );

  const renderDonation = ({ item: donation }) => {
    const charity = getCharityById(donation.charityId);
    if (!charity) return null;

    return (
      <View style={styles.donationItem}>
        <Image source={{ uri: charity.logo }} style={styles.donationLogo} />
        <View style={styles.donationInfo}>
          <Text style={styles.donationCharityName}>{charity.name}</Text>
          <Text style={styles.donationAmount}>{formatCurrency(donation.amount)}</Text>
          <Text style={styles.donationDate}>{formatDate(donation.date)}</Text>
          {donation.message && (
            <Text style={styles.donationMessage}>{donation.message}</Text>
          )}
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Profile Info */}
      <View style={styles.profileSection}>
        <Image source={{ uri: user.avatar }} style={styles.avatar} />
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userCountry}>{user.country}</Text>
          <Text style={styles.userJoined}>
            Member since {new Date(user.joinedDate).toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        {renderStatsCard(
          'Total Donated',
          formatCurrency(user.totalDonated),
          'heart',
          '#EF4444'
        )}
        {renderStatsCard(
          'Charities Followed',
          user.followedCharities.length.toString(),
          'people',
          '#3B82F6'
        )}
        {renderStatsCard(
          'Donations Made',
          user.totalDonations.toString(),
          'gift',
          '#22C55E'
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleBrowseCharities}
        >
          <Ionicons name="heart-outline" size={20} color="#3B82F6" />
          <Text style={styles.actionText}>Browse Charities</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Feed')}
        >
          <Ionicons name="home-outline" size={20} color="#3B82F6" />
          <Text style={styles.actionText}>View Feed</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSectionHeader = (title) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  if (loading) {
    return <LoadingSpinner text="Loading profile..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={donations}
        renderItem={renderDonation}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
        ListHeaderComponent={renderHeader}
        ListFooterComponent={
          <View>
            {/* Followed Charities Section */}
            {followedCharities.length > 0 && (
              <View>
                {renderSectionHeader('Followed Charities')}
                <FlatList
                  data={followedCharities}
                  renderItem={renderFollowedCharity}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </View>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  userCountry: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  userJoined: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  statsIconContainer: {
    marginRight: 16,
  },
  statsContent: {
    flex: 1,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  statsLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  actionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  charityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  charityLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  charityInfo: {
    flex: 1,
  },
  charityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  charityCategory: {
    fontSize: 14,
    color: '#6B7280',
  },
  donationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  donationLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  donationInfo: {
    flex: 1,
  },
  donationCharityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  donationAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22C55E',
    marginBottom: 4,
  },
  donationDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  donationMessage: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
  },
});

export default ProfileScreen;
