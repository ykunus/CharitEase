import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Image,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { supabase } from '../config/supabase';

const ProfileScreen = ({ navigation }) => {
  const { user, donations, getCharityById, getFollowedCharitiesData, isConnected, signOut } = useAuth();
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

  const handleSignOut = async () => {
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
            // Navigation will be handled by the main app component
          }
        }
      ]
    );
  };

  const testDatabase = async () => {
    try {
      // Test 1: Check users table
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      // Test 2: Check charities table
      const { data: charities, error: charitiesError } = await supabase
        .from('charities')
        .select('name, country')
        .limit(3);

      // Test 3: Check posts table
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('title, type')
        .limit(3);

      if (usersError || charitiesError || postsError) {
        Alert.alert(
          '❌ Database Test Failed',
          `Users: ${usersError?.message || 'OK'}\nCharities: ${charitiesError?.message || 'OK'}\nPosts: ${postsError?.message || 'OK'}`
        );
      } else {
        Alert.alert(
          '✅ Database Test Successful!',
          `✅ Users: ${users[0]?.count || 0} records\n✅ Charities: ${charities.length} records\n✅ Posts: ${posts.length} records\n\nDatabase is working perfectly!`
        );
      }
    } catch (error) {
      Alert.alert('❌ Database Connection Failed', error.message);
    }
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
          <View style={styles.connectionStatus}>
            <Ionicons 
              name={isConnected ? "checkmark-circle" : "alert-circle"} 
              size={16} 
              color={isConnected ? "#22C55E" : "#F59E0B"} 
            />
            <Text style={[styles.connectionText, { color: isConnected ? "#22C55E" : "#F59E0B" }]}>
              {isConnected ? "Database Connected" : "Using Demo Data"}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        {renderStatsCard(
          'Total Donated',
          formatCurrency(user.totalDonated || 0),
          'heart',
          '#EF4444'
        )}
        {renderStatsCard(
          'Charities Followed',
          (user.followedCharities?.length || 0).toString(),
          'people',
          '#3B82F6'
        )}
        {renderStatsCard(
          'Donations Made',
          (user.totalDonations || 0).toString(),
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

      {/* Sign Out Button */}
      <TouchableOpacity 
        style={styles.signOutButton}
        onPress={handleSignOut}
      >
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

    </View>
  );

  const renderSectionHeader = (title) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  if (loading || !user) {
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
    marginBottom: 8,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
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
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 12,
  },
  signOutText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
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
