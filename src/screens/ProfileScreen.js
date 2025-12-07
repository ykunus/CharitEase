import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Image,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';
import { supabase } from '../config/supabase';
import ConfirmationModal from '../components/ConfirmationModal';
import EmptyState from '../components/EmptyState';
import PostCard from '../components/PostCard';
import CommentModal from '../components/CommentModal';

const ProfileScreen = ({ navigation }) => {
  const { user, donations, posts, charitiesData, getCharityById, getFollowedCharitiesData, likePost, likedPosts } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' or 'donations' or 'following'
  const [charityDbId, setCharityDbId] = useState(null);
  const [commentModalPost, setCommentModalPost] = useState(null);

  const isCharity = user?.userType === 'charity';
  const followedCharities = getFollowedCharitiesData();

  // Get charity database ID for matching posts
  useEffect(() => {
    if (isCharity && user?.email && charitiesData?.length > 0) {
      // Find charity by email match
      const charity = charitiesData.find(c => c.email === user.email);
      if (charity) {
        setCharityDbId(charity.id);
      }
    }
  }, [isCharity, user?.email, charitiesData]);

  // Get user's or charity's posts
  const userPosts = useMemo(() => {
    if (!user) return [];
    
    // Use user.posts array if available (most reliable)
    if (user.posts && Array.isArray(user.posts) && user.posts.length > 0) {
      // user.posts is already an array of post objects, just sort them
      return [...user.posts].sort((a, b) => {
        const dateA = new Date(a.timestamp || 0);
        const dateB = new Date(b.timestamp || 0);
        return dateB - dateA;
      });
    }
    
    // Fallback: filter from global posts array
    if (!posts) return [];
    
    if (isCharity) {
      // Charity posts: match charity database ID
      return posts.filter(post => post.charityId === charityDbId)
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    } else {
      // User posts: check userId or charityId === null
      const userPostIds = user.posts ? user.posts.map(p => typeof p === 'object' ? p.id : p) : [];
      return posts.filter(post => {
        const postIdStr = String(post.id);
        return userPostIds.includes(postIdStr) || 
               (post.charityId === null && post.userId === user.id) ||
               (post.charityId === null && userPostIds.length === 0);
      }).sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    }
  }, [posts, user, isCharity, charityDbId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  const handleLike = (postId) => {
    likePost(postId);
  };

  const handleComment = (post) => {
    setCommentModalPost(post);
  };

  const handleShare = (post) => {
    // Handle sharing functionality
    console.log('Share post:', post.id);
  };

  const handleCharityPress = (charity) => {
    navigation.navigate('CharityProfileView', { charityId: charity.id });
  };

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  const handleSignOut = () => {
    setShowSignOutModal(true);
  };

  const confirmSignOut = async () => {
    setShowSignOutModal(false);
    await signOut();
    // Navigation will be handled by the main app component
  };

  const cancelSignOut = () => {
    setShowSignOutModal(false);
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

  const renderCompactStat = (icon, value, label, color) => (
    <View style={styles.compactStat}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    <View>
      {/* Header with Settings Button */}
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>Profile</Text>
        <TouchableOpacity onPress={handleSettingsPress} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* Profile Card - LinkedIn Style */}
      <View style={styles.profileCard}>
        {/* Avatar centered at top */}
        <View style={styles.avatarContainer}>
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
          {isCharity && user.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
            </View>
          )}
        </View>

        {/* Name and Basic Info */}
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userLocation}>
          <Ionicons name="location-outline" size={14} color="#6B7280" /> {user.country}
        </Text>

        {/* Compact Stats Row */}
        <View style={styles.statsRow}>
          {isCharity ? (
            <>
              {renderCompactStat(
                'trending-up',
                formatCurrency(user.totalRaised || 0),
                'Raised',
                '#22C55E'
              )}
              {renderCompactStat(
                'people',
                (user.followers || 0).toString(),
                'Followers',
                '#3B82F6'
              )}
            </>
          ) : (
            <>
              {renderCompactStat(
                'heart',
                formatCurrency(user.totalDonated || 0),
                'Donated',
                '#EF4444'
              )}
              {renderCompactStat(
                'people',
                (user.followedCharities?.length || 0).toString(),
                'Following',
                '#3B82F6'
              )}
              {renderCompactStat(
                'gift',
                (user.totalDonations || 0).toString(),
                'Donations',
                '#22C55E'
              )}
            </>
          )}
        </View>

        {/* Member Since */}
        <Text style={styles.memberSince}>
          {isCharity ? '🏢 Charity' : '👤 Member'} since {new Date(user.joinedDate).toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          })}
        </Text>
      </View>

      {/* About/Description Section */}
      <View style={styles.aboutCard}>
        <Text style={styles.sectionTitle}>About</Text>
        {isCharity ? (
          <>
            <Text style={styles.aboutText}>{user.mission}</Text>
            <View style={styles.detailsGrid}>
              {user.category && (
                <View style={styles.detailItem}>
                  <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{user.category}</Text>
                </View>
              )}
              {user.foundedYear && (
                <View style={styles.detailItem}>
                  <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>Founded {user.foundedYear}</Text>
                </View>
              )}
              {user.website && (
                <View style={styles.detailItem}>
                  <Ionicons name="globe-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailTextLink} numberOfLines={1}>{user.website}</Text>
                </View>
              )}
              {user.phone && (
                <View style={styles.detailItem}>
                  <Ionicons name="call-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{user.phone}</Text>
                </View>
              )}
              {user.address && (
                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{user.address}</Text>
                </View>
              )}
              {!user.verified && (
                <View style={styles.detailItem}>
                  <Ionicons name="time-outline" size={16} color="#F59E0B" />
                  <Text style={[styles.detailText, { color: '#F59E0B' }]}>Pending Verification</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            {user.bio ? (
              <Text style={styles.aboutText}>{user.bio}</Text>
            ) : (
              <Text style={styles.emptyBioText}>No bio added yet</Text>
            )}
          </>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Ionicons 
            name="grid-outline" 
            size={20} 
            color={activeTab === 'posts' ? (isCharity ? '#22C55E' : '#3B82F6') : '#6B7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
            Posts
          </Text>
        </TouchableOpacity>
        {!isCharity && (
          <>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'donations' && styles.tabActive]}
              onPress={() => setActiveTab('donations')}
            >
              <Ionicons 
                name="heart-outline" 
                size={20} 
                color={activeTab === 'donations' ? '#3B82F6' : '#6B7280'} 
              />
              <Text style={[styles.tabText, activeTab === 'donations' && styles.tabTextActive]}>
                Donations
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'following' && styles.tabActive]}
              onPress={() => setActiveTab('following')}
            >
              <Ionicons 
                name="people-outline" 
                size={20} 
                color={activeTab === 'following' ? '#3B82F6' : '#6B7280'} 
              />
              <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>
                Following
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  const renderPost = ({ item: post }) => {
    // For charity posts, get charity info
    const charity = post.charityId ? getCharityById(post.charityId) : null;
    
    // For user posts (no charity), create a mock charity object from user
    const postAuthor = charity || (post.charityId === null ? {
      id: user.id,
      name: user.name,
      logo: user.avatar,
      verified: false
    } : null);

    if (!postAuthor) return null;

    return (
      <PostCard
        post={post}
        charity={postAuthor}
        isLiked={likedPosts?.includes(post.id)}
        onLike={handleLike}
        onComment={() => handleComment(post)}
        onShare={() => handleShare(post)}
        onCharityPress={handleCharityPress}
      />
    );
  };

  const renderTabContent = () => {
    if (activeTab === 'posts') {
      if (isCharity && userPosts.length === 0) {
        return (
          <EmptyState
            icon="grid-outline"
            title="No posts yet"
            message="Share updates about your charity's impact and activities!"
          />
        );
      }
      if (!isCharity && userPosts.length === 0) {
        return (
          <EmptyState
            icon="grid-outline"
            title="No posts yet"
            message="Share your thoughts and experiences with the community!"
          />
        );
      }
      return (
        <FlatList
          data={userPosts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.postsContainer}
        />
      );
    }

    if (activeTab === 'donations') {
      if (donations.length === 0) {
        return (
          <EmptyState
            icon="heart-outline"
            title="No donations yet"
            message="Start supporting charities you care about!"
          />
        );
      }
      return (
        <FlatList
          data={donations}
          renderItem={renderDonation}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      );
    }

    if (activeTab === 'following') {
      if (followedCharities.length === 0) {
        return (
          <EmptyState
            icon="people-outline"
            title="Not following anyone yet"
            message="Discover and follow charities to see their updates!"
          />
        );
      }
      return (
        <FlatList
          data={followedCharities}
          renderItem={renderFollowedCharity}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      );
    }

    return null;
  };

  if (loading || !user) {
    return <LoadingSpinner text="Loading profile..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isCharity ? '#22C55E' : '#3B82F6'}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {renderHeader()}
        {renderTabContent()}
      </ScrollView>
      
      {/* Custom Sign Out Confirmation Modal - Better for screen mirroring */}
      <ConfirmationModal
        visible={showSignOutModal}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        cancelText="Cancel"
        confirmStyle="destructive"
        onConfirm={confirmSignOut}
        onCancel={cancelSignOut}
      />
      
      {/* Comment Modal */}
      <CommentModal
        visible={commentModalPost !== null}
        post={commentModalPost}
        onClose={() => setCommentModalPost(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  settingsButton: {
    padding: 8,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 6,
  },
  userLocation: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    width: '100%',
    marginBottom: 16,
  },
  compactStat: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  memberSince: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  aboutCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 16,
  },
  emptyBioText: {
    fontSize: 15,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  detailsGrid: {
    gap: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  detailTextLink: {
    fontSize: 14,
    color: '#3B82F6',
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginTop: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#3B82F6',
  },
  postsContainer: {
    paddingTop: 12,
  },
  charityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  charityLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  charityInfo: {
    flex: 1,
  },
  charityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 13,
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
