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

const CharityProfileViewScreen = ({ route, navigation }) => {
  const { charityId } = route.params || {};
  const { posts, charitiesData, getCharityById, likePost, likedPosts, loadCharityProfileById } = useAuth();
  const [viewedCharity, setViewedCharity] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [commentModalPost, setCommentModalPost] = useState(null);

  // Load charity profile by ID
  useEffect(() => {
    if (charityId) {
      loadCharityData();
    }
  }, [charityId]);

  const loadCharityData = async () => {
    if (!charityId) return;
    
    setLoading(true);
    try {
      // Use the loadCharityProfileById function if available, otherwise load directly
      if (loadCharityProfileById) {
        const charityProfile = await loadCharityProfileById(charityId);
        if (charityProfile) {
          setViewedCharity(charityProfile);
          setLoading(false);
          return;
        }
      }
      
      // Fallback: Load charity from database directly
      const { data: charityProfile, error } = await supabase
        .from('charities')
        .select('*')
        .eq('id', charityId)
        .single();

      if (error) throw error;

      if (charityProfile) {
        // Load charity's posts
        let charityPosts = [];
        if (charityProfile.posts && Array.isArray(charityProfile.posts) && charityProfile.posts.length > 0) {
          const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select('*')
            .in('id', charityProfile.posts)
            .order('created_at', { ascending: false });
          
          if (!postsError && postsData) {
            charityPosts = postsData.map(post => ({
              id: post.id,
              charityId: post.charity_id,
              userId: null,
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
        }

        // Format charity object
        const formattedCharity = {
          id: charityProfile.id,
          email: charityProfile.email,
          name: charityProfile.name,
          category: charityProfile.category,
          country: charityProfile.country,
          mission: charityProfile.mission || '',
          logo: charityProfile.logo_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          coverImage: charityProfile.cover_image_url || charityProfile.logo_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          totalRaised: charityProfile.total_raised || 0,
          followers: charityProfile.followers || 0,
          verified: charityProfile.verified || false,
          foundedYear: charityProfile.founded_year || null,
          website: charityProfile.website || null,
          phone: charityProfile.phone || null,
          address: charityProfile.address || null,
          posts: charityPosts,
          joinedDate: charityProfile.created_at || new Date().toISOString(),
          userType: 'charity'
        };

        setViewedCharity(formattedCharity);
      }
    } catch (error) {
      console.error('Error loading charity profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get charity's posts
  const charityPosts = useMemo(() => {
    if (!viewedCharity) return [];
    
    // Use charity.posts array if available
    if (viewedCharity.posts && Array.isArray(viewedCharity.posts) && viewedCharity.posts.length > 0) {
      return [...viewedCharity.posts].sort((a, b) => {
        const dateA = new Date(a.timestamp || 0);
        const dateB = new Date(b.timestamp || 0);
        return dateB - dateA;
      });
    }
    
    // Fallback: filter from global posts array
    if (!posts) return [];
    
    return posts.filter(post => post.charityId === viewedCharity.id)
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  }, [posts, viewedCharity]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCharityData().finally(() => {
      setRefreshing(false);
    });
  }, [charityId]);

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
    // Navigate to another charity profile if clicked
    if (charity.id !== viewedCharity?.id) {
      navigation.replace('CharityProfileView', { charityId: charity.id });
    }
  };

  const handleUserPress = (userId) => {
    navigation.navigate('UserProfileView', { userId });
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
        <Text style={styles.screenTitle}>{viewedCharity?.name || 'Charity'}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: viewedCharity?.logo || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' }} 
            style={styles.avatar} 
          />
          {viewedCharity?.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
            </View>
          )}
        </View>

        <Text style={styles.userName}>{viewedCharity?.name || 'Charity'}</Text>
        {viewedCharity?.country && (
          <Text style={styles.userLocation}>
            <Ionicons name="location-outline" size={14} color="#6B7280" /> {viewedCharity.country}
          </Text>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {renderCompactStat(
            'trending-up',
            formatCurrency(viewedCharity?.totalRaised || 0),
            'Raised',
            '#22C55E'
          )}
          {renderCompactStat(
            'people',
            (viewedCharity?.followers || 0).toString(),
            'Followers',
            '#3B82F6'
          )}
        </View>

        <Text style={styles.memberSince}>
          🏢 Charity since {viewedCharity?.joinedDate ? new Date(viewedCharity.joinedDate).toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          }) : 'Recently'}
        </Text>
      </View>

      {/* About Section */}
      <View style={styles.aboutCard}>
        <Text style={styles.sectionTitle}>About</Text>
        {viewedCharity?.mission ? (
          <Text style={styles.aboutText}>{viewedCharity.mission}</Text>
        ) : (
          <Text style={styles.emptyBioText}>No mission statement added yet</Text>
        )}
        
        <View style={styles.detailsGrid}>
          {viewedCharity?.category && (
            <View style={styles.detailItem}>
              <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
              <Text style={styles.detailText}>{viewedCharity.category}</Text>
            </View>
          )}
          {viewedCharity?.foundedYear && (
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={styles.detailText}>Founded {viewedCharity.foundedYear}</Text>
            </View>
          )}
          {viewedCharity?.website && (
            <View style={styles.detailItem}>
              <Ionicons name="globe-outline" size={16} color="#6B7280" />
              <Text style={styles.detailTextLink} numberOfLines={1}>{viewedCharity.website}</Text>
            </View>
          )}
          {viewedCharity?.phone && (
            <View style={styles.detailItem}>
              <Ionicons name="call-outline" size={16} color="#6B7280" />
              <Text style={styles.detailText}>{viewedCharity.phone}</Text>
            </View>
          )}
          {viewedCharity?.address && (
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text style={styles.detailText}>{viewedCharity.address}</Text>
            </View>
          )}
          {!viewedCharity?.verified && (
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={16} color="#F59E0B" />
              <Text style={[styles.detailText, { color: '#F59E0B' }]}>Pending Verification</Text>
            </View>
          )}
        </View>
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
    // For charity posts, use viewed charity as author
    const postAuthor = {
      id: viewedCharity.id,
      name: viewedCharity.name,
      logo: viewedCharity.logo,
      verified: viewedCharity.verified
    };

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
        onUserPress={handleUserPress}
      />
    );
  };

  if (loading) {
    return <LoadingSpinner text="Loading charity profile..." />;
  }

  if (!viewedCharity) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Charity</Text>
          <View style={styles.placeholder} />
        </View>
        <EmptyState
          icon="heart-outline"
          title="Charity not found"
          message="This charity profile could not be loaded."
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
            {charityPosts.length === 0 ? (
              <EmptyState
                icon="grid-outline"
                title="No posts yet"
                message="This charity hasn't shared any posts yet."
              />
            ) : (
              <FlatList
                data={charityPosts}
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
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFFFFF',
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
    marginBottom: 16,
  },
  emptyBioText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    flex: 1,
    minWidth: '48%',
  },
  detailText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  detailTextLink: {
    fontSize: 13,
    color: '#3B82F6',
    flex: 1,
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
});

export default CharityProfileViewScreen;

