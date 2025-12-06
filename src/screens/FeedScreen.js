import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { userProfile } from '../data/demoData';
import PostCard from '../components/PostCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import CommentModal from '../components/CommentModal';
import { calculateDistanceKm, kmToMiles } from '../utils/geo';

const TAB_CONFIG = [
  { key: 'following', label: 'Following', icon: 'heart-outline' },
  { key: 'global', label: 'Global', icon: 'earth-outline' },
  { key: 'local', label: 'Local', icon: 'location-outline' }
];

const MIN_DISTANCE = 5; // miles
const MAX_DISTANCE = 300; // miles
const DISTANCE_STEP = 10; // miles
const DEFAULT_DISTANCE_MILES = 60;

const FeedScreen = ({ navigation }) => {
  const {
    posts,
    charitiesData,
    followedCharities,
    getCharityById,
    likePost,
    user,
    likedPosts
  } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('following');
  const [distance, setDistance] = useState(DEFAULT_DISTANCE_MILES);
  const [commentModalPost, setCommentModalPost] = useState(null);

  const userLocation = user?.location || userProfile.location;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh delay
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
    navigation.navigate('Charities', {
      screen: 'CharityDetail',
      params: { charity }
    });
  };

  const sortedPosts = useMemo(() => {
    if (!posts) return [];
    return [...posts].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [posts]);

  const followingPosts = useMemo(() => {
    if (!sortedPosts.length || !user) return [];
    
    // Get user's post IDs from their posts array
    const userPostIds = [];
    if (user.posts && Array.isArray(user.posts)) {
      user.posts.forEach(p => {
        const id = typeof p === 'object' && p.id ? p.id : (typeof p === 'string' ? p : null);
        if (id) userPostIds.push(String(id));
      });
    }
    
    // Include posts from followed charities AND user's own posts
    return sortedPosts.filter((post) => {
      const postIdStr = String(post.id);
      
      // User's own posts - check if post ID is in user's posts array
      const isUserPost = userPostIds.includes(postIdStr) || 
                         (post.charityId === null && post.userId === user.id);
      
      // Posts from followed charities
      const isFollowedCharityPost = followedCharities?.length > 0 && 
                                     post.charityId && 
                                     followedCharities.includes(post.charityId);
      
      return isUserPost || isFollowedCharityPost;
    });
  }, [sortedPosts, followedCharities, user]);

  const localFeed = useMemo(() => {
    if (!sortedPosts.length || !charitiesData?.length || !userLocation) {
      return { posts: [], distances: {} };
    }

    const distanceMap = {};
    const localItems = [];

    sortedPosts.forEach((post) => {
      const charity = charitiesData.find((item) => item.id === post.charityId);
      if (!charity?.location?.latitude || !charity?.location?.longitude) {
        return;
      }

      const distanceKm = calculateDistanceKm(userLocation, charity.location);
      const distanceToCharity = kmToMiles(distanceKm);
      if (distanceToCharity === null || distanceToCharity > distance) {
        return;
      }

      localItems.push({ post, distance: distanceToCharity });
      distanceMap[post.id] = distanceToCharity;
    });

    localItems.sort((a, b) => {
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }

      return new Date(b.post.timestamp).getTime() - new Date(a.post.timestamp).getTime();
    });

    return {
      posts: localItems.map((item) => item.post),
      distances: distanceMap
    };
  }, [sortedPosts, charitiesData, userLocation, distance]);
  const localPosts = localFeed.posts;
  const localDistances = localFeed.distances;

  const formatDistance = (value) => {
    if (value == null) return '';
    return `${value.toFixed(value < 10 ? 1 : 0)} mi away`;
  };

  const activePosts = useMemo(() => {
    switch (selectedTab) {
      case 'global':
        return sortedPosts;
      case 'local':
        return localPosts;
      case 'following':
      default:
        return followingPosts;
    }
  }, [selectedTab, sortedPosts, localPosts, followingPosts]);

  const contentContainerStyle =
    activePosts.length === 0
      ? [styles.contentContainer, styles.emptyContainer]
      : styles.contentContainer;

  const handleDistanceChange = (delta) => {
    setDistance((prev) => {
      const next = prev + delta;
      if (next < MIN_DISTANCE) return MIN_DISTANCE;
      if (next > MAX_DISTANCE) return MAX_DISTANCE;
      return next;
    });
  };

  const renderPost = ({ item: post }) => {
    // For charity posts, get charity info
    const charity = post.charityId ? getCharityById(post.charityId) : null;
    
    // For user posts (no charity), create a mock charity object from user
    const postAuthor = charity || (post.charityId === null && user ? {
      id: user.id,
      name: user.name,
      logo: user.avatar,
      verified: false
    } : null);

    if (!postAuthor) return null;

    const distanceFromUser =
      selectedTab === 'local' && typeof localDistances[post.id] === 'number'
        ? localDistances[post.id]
        : null;

    return (
      <View style={styles.postWrapper}>
        {distanceFromUser !== null && (
          <View style={styles.distancePill}>
            <Ionicons name="navigate-outline" size={14} color="#1F2937" />
            <Text style={styles.distancePillText}>{formatDistance(distanceFromUser)}</Text>
          </View>
        )}
        <PostCard
          post={post}
          charity={postAuthor}
          isLiked={likedPosts?.includes(post.id)}
          onLike={handleLike}
          onComment={() => handleComment(post)}
          onShare={() => handleShare(post)}
          onCharityPress={handleCharityPress}
        />
      </View>
    );
  };

  const renderEmpty = () => {
    if (selectedTab === 'following') {
      return (
        <EmptyState
          icon="heart-outline"
          title="No posts yet"
          message="Follow some charities to see their updates in your feed!"
          actionText="Browse Charities"
          onAction={() => navigation.navigate('Charities')}
        />
      );
    }

    if (selectedTab === 'global') {
      return (
        <EmptyState
          icon="earth-outline"
          title="No global updates"
          message="Charities haven't shared any updates yet. Check back soon!"
        />
      );
    }

    if (!userLocation) {
      return (
        <EmptyState
          icon="location-outline"
          title="Set your location"
          message="Add a location in your profile to discover nearby charities and updates."
          actionText="Go to Profile"
          onAction={() => navigation.navigate('Profile')}
        />
      );
    }

    return (
      <EmptyState
        icon="location-outline"
        title="No local updates yet"
        message={`Try expanding your search radius to see more charity updates within ${distance} miles.`}
        actionText="Increase Distance"
        onAction={() => handleDistanceChange(DISTANCE_STEP)}
      />
    );
  };

  const getHeaderCopy = () => {
    switch (selectedTab) {
      case 'global':
        return {
          title: 'Global Updates',
          subtitle: 'See how charities are creating impact around the world'
        };
      case 'local':
        if (!userLocation) {
          return {
            title: 'Local Impact',
            subtitle: 'Add your location to explore nearby charity work'
          };
        }
        return {
          title: 'Local Impact',
          subtitle: `Charity stories within ${distance} miles of you`
        };
      case 'following':
      default:
        return {
          title: 'Your Feed',
          subtitle: 'Updates from charities you follow'
        };
    }
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {TAB_CONFIG.map((tab) => {
        const isActive = tab.key === selectedTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, isActive && styles.tabButtonActive]}
            onPress={() => setSelectedTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={isActive ? '#FFFFFF' : '#22C55E'}
              style={styles.tabIcon}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderDistanceControls = () => {
    if (selectedTab !== 'local') return null;

    return (
      <View style={styles.distanceContainer}>
        <TouchableOpacity
          style={styles.mapButton}
          onPress={() =>
            navigation.navigate('LocalCharityMap', {
              radius: distance,
              location: userLocation,
            })
          }
        >
          <View style={styles.mapButtonContent}>
            <Ionicons name="map-outline" size={18} color="#FFFFFF" />
            <Text style={styles.mapButtonLabel}>View Nearby Charities on Map</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => {
    const { title, subtitle } = getHeaderCopy();

    return (
      <View>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>
        {renderTabBar()}
        {renderDistanceControls()}
      </View>
    );
  };

  if (loading) {
    return <LoadingSpinner text="Loading your feed..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={activePosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#22C55E"
          />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
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
  contentContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#22C55E',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
  },
  tabButtonActive: {
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  tabIcon: {
    marginRight: 6,
  },
  distanceContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  distanceLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
    fontWeight: '500',
  },
  distanceControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 12,
  },
  distanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  mapButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  mapButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapButtonLabel: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  postWrapper: {
    marginTop: 12,
    marginBottom: 4,
  },
  distancePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    marginLeft: 16,
  },
  distancePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 6,
  },
});

export default FeedScreen;
