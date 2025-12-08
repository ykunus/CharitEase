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
import EmptyState from '../components/EmptyState';
import PostCard from '../components/PostCard';
import CommentModal from '../components/CommentModal';
import LoadingSpinner from '../components/LoadingSpinner';

const UserProfileViewScreen = ({ route, navigation }) => {
  const { userId } = route.params || {};
  const { posts, charitiesData, getCharityById, likePost, likedPosts, loadUserProfileById, user: currentUser, followedCharities, followedUsers, followCharity, followUser } = useAuth();
  const [viewedUser, setViewedUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [commentModalPost, setCommentModalPost] = useState(null);
  
  // Check if current user is following this user
  // Check if it's a charity (followed in charities list) or a regular user (followed in users list)
  const isFollowing = viewedUser?.userType === 'charity' 
    ? followedCharities?.includes(viewedUser?.id)
    : followedUsers?.includes(viewedUser?.id);
  
  const handleFollow = () => {
    if (!viewedUser?.id) return;
    
    // If it's a charity, use followCharity function
    if (viewedUser?.userType === 'charity') {
      followCharity(viewedUser.id);
    } else {
      // If it's a regular user, use followUser function
      followUser(viewedUser.id);
    }
    
    // Reload user data to update stats after following
    setTimeout(() => {
      loadUserData();
    }, 500);
  };

  // Load user profile by ID
  useEffect(() => {
    if (userId) {
      loadUserData();
    }
  }, [userId]);

  const loadUserData = async () => {
    if (!userId || userId === 'unknown') {
      setLoading(false);
      return;
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('Invalid userId format:', userId);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Load user from database
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (userProfile) {
        // Load user's posts - find posts where user_id matches this user
        // Use user_id column in posts table (if it exists)
        let userPosts = [];
        
        // Method 1: Query posts by user_id (preferred method, if column exists)
        const { data: postsByUserId, error: postsByUserIdError } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        // Check if error is because column doesn't exist (code 42703)
        if (postsByUserIdError && postsByUserIdError.code === '42703') {
          // Column doesn't exist - need to run migration
          console.log('⚠️ user_id column doesn\'t exist in posts table - please run migration');
          // Fallback: query all user posts (charity_id = null) but can't filter by user
          const { data: allUserPosts } = await supabase
            .from('posts')
            .select('*')
            .is('charity_id', null)
            .order('created_at', { ascending: false })
            .limit(50);
          
          if (allUserPosts) {
            // Can't reliably filter by user without user_id column
            // Just show all user posts (not ideal but works)
            userPosts = allUserPosts.map(post => ({
              id: post.id,
              charityId: post.charity_id,
              userId: userId, // Assume this user created it (not accurate but better than nothing)
              type: post.type,
              title: post.title,
              content: post.content,
              image: post.image_url,
              likes: post.likes_count || 0,
              comments: post.comments_count || 0,
              shares: post.shares_count || 0,
              timestamp: post.created_at
            }));
          }
        } else if (!postsByUserIdError && postsByUserId && postsByUserId.length > 0) {
          // Successfully queried by user_id
          userPosts = postsByUserId.map(post => ({
            id: post.id,
            charityId: post.charity_id,
            userId: userId,
            type: post.type,
            title: post.title,
            content: post.content,
            image: post.image_url,
            likes: post.likes_count || 0,
            comments: post.comments_count || 0,
            shares: post.shares_count || 0,
            timestamp: post.created_at
          }));
        }

        // Format user object
        const formattedUser = {
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          country: userProfile.country,
          bio: userProfile.bio || '',
          avatar: userProfile.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          totalDonated: userProfile.total_donated || 0,
          totalDonations: userProfile.total_donations || 0,
          followedCharities: Array.isArray(userProfile.followed_charities) 
            ? userProfile.followed_charities 
            : [],
          posts: userPosts,
          joinedDate: userProfile.created_at || new Date().toISOString(),
          userType: userProfile.user_type || 'user'
        };

        setViewedUser(formattedUser);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get user's posts - ALWAYS filter from global posts array (single source of truth)
  const userPosts = useMemo(() => {
    if (!viewedUser || !posts) return [];
    
    // Get post IDs from viewedUser.posts (now stores only IDs, not full objects)
    const userPostIds = new Set();
    if (viewedUser.posts && Array.isArray(viewedUser.posts)) {
      viewedUser.posts.forEach(p => {
        const id = typeof p === 'object' && p.id ? String(p.id) : String(p);
        if (id && id !== 'null' && id !== 'undefined') userPostIds.add(id);
      });
    }
    
    // Always filter from global posts array (single source of truth)
    return posts
      .filter(post => {
        const postIdStr = String(post.id);
        return userPostIds.has(postIdStr) || 
               (post.charityId === null && post.userId === viewedUser.id);
      })
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  }, [posts, viewedUser]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUserData().finally(() => {
      setRefreshing(false);
    });
  }, [userId]);

  const handleLike = (postId) => {
    likePost(postId);
  };

  const handleComment = (post) => {
    setCommentModalPost(post);
  };

  const handleShare = (post) => {
    console.log('Share post:', post.id);
  };

  const handleCharityPress = (charity) => {
    // Navigate to charity profile view (same as what charity sees)
    if (charity && charity.id) {
      navigation.navigate('CharityProfileView', { charityId: charity.id });
    }
  };

  const renderCompactStat = (icon, value, label, color) => (
    <View style={styles.compactStat}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderHeader = () => (
    <View>
      {/* Header with Back Button */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>{viewedUser?.name || 'Profile'}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: viewedUser?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' }} 
            style={styles.avatar} 
          />
        </View>

        <Text style={styles.userName}>{viewedUser?.name || 'User'}</Text>
        {viewedUser?.country && (
          <Text style={styles.userLocation}>
            <Ionicons name="location-outline" size={14} color="#6B7280" /> {viewedUser.country}
          </Text>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {renderCompactStat(
            'heart',
            formatCurrency(viewedUser?.totalDonated || 0),
            'Donated',
            '#EF4444'
          )}
          {renderCompactStat(
            'people',
            (viewedUser?.followedCharities?.length || 0).toString(),
            'Following',
            '#3B82F6'
          )}
          {renderCompactStat(
            'gift',
            (viewedUser?.totalDonations || 0).toString(),
            'Donations',
            '#22C55E'
          )}
        </View>

        <Text style={styles.memberSince}>
          👤 Member since {viewedUser?.joinedDate ? new Date(viewedUser.joinedDate).toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          }) : 'Recently'}
        </Text>
        
        {/* Action Button - Follow only for users (no Donate button for regular users) */}
        {viewedUser && currentUser && viewedUser.id !== currentUser.id && (
          <TouchableOpacity
            style={[styles.actionButton, isFollowing && styles.actionButtonSecondary]}
            onPress={handleFollow}
          >
            <Ionicons 
              name={isFollowing ? 'checkmark' : 'add'} 
              size={20} 
              color={isFollowing ? '#22C55E' : '#FFFFFF'} 
            />
            <Text style={[styles.actionButtonText, isFollowing && styles.actionButtonTextSecondary]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* About Section */}
      <View style={styles.aboutCard}>
        <Text style={styles.sectionTitle}>About</Text>
        {viewedUser?.bio ? (
          <Text style={styles.aboutText}>{viewedUser.bio}</Text>
        ) : (
          <Text style={styles.emptyBioText}>No bio added yet</Text>
        )}
      </View>

      {/* Tabs - Only Posts for view mode */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Ionicons 
            name="grid-outline" 
            size={20} 
            color="#22C55E"
          />
          <Text style={[styles.tabText, styles.tabTextActive]}>
            Posts
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPost = ({ item: post }) => {
    // For user posts (no charity), create a mock charity object from viewedUser
    const postAuthor = post.charityId === null ? {
      id: viewedUser.id,
      name: viewedUser.name,
      logo: viewedUser.avatar,
      verified: false
    } : getCharityById(post.charityId);

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

  if (loading) {
    return <LoadingSpinner text="Loading profile..." />;
  }

  if (!viewedUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <EmptyState
          icon="person-outline"
          title="User not found"
          message="This user profile could not be loaded."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#22C55E"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {renderHeader()}
        
        {activeTab === 'posts' && (
          <>
            {userPosts.length === 0 ? (
              <EmptyState
                icon="grid-outline"
                title="No posts yet"
                message="This user hasn't shared any posts yet."
              />
            ) : (
              <FlatList
                data={userPosts}
                renderItem={renderPost}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.postsContainer}
              />
            )}
          </>
        )}
      </ScrollView>
      
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
  contentContainer: {
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
  backButton: {
    padding: 8,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
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
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  userLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 16,
  },
  compactStat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  memberSince: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  aboutCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 8,
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
  },
  emptyBioText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#22C55E',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },
  tabTextActive: {
    color: '#22C55E',
  },
  postsContainer: {
    paddingTop: 8,
  },
  actionButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#22C55E',
    borderRadius: 8,
    width: '100%',
  },
  actionButtonPrimary: {
    backgroundColor: '#22C55E',
  },
  actionButtonSecondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#22C55E',
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonTextSecondary: {
    color: '#22C55E',
  },
});

export default UserProfileViewScreen;

