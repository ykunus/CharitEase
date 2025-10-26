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

const TAB_CONFIG = [
  { key: 'following', label: 'Following', icon: 'heart-outline' },
  { key: 'global', label: 'Global', icon: 'earth-outline' },
  { key: 'local', label: 'Local', icon: 'location-outline' }
];

const MIN_DISTANCE = 10;
const MAX_DISTANCE = 500;
const DISTANCE_STEP = 25;

const calculateDistanceKm = (from, to) => {
  if (!from || !to) return null;

  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

const FeedScreen = ({ navigation }) => {
  const {
    posts,
    charitiesData,
    followedCharities,
    getCharityById,
    likePost,
    user
  } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('following');
  const [distance, setDistance] = useState(100);

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
    // Navigate to comments or show comment modal
    console.log('Comment on post:', post.id);
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
    if (!sortedPosts.length || !followedCharities?.length) return [];
    return sortedPosts.filter((post) => followedCharities.includes(post.charityId));
  }, [sortedPosts, followedCharities]);

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

      const distanceToCharity = calculateDistanceKm(userLocation, charity.location);
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
    if (value < 1) {
      return `${Math.round(value * 1000)} m away`;
    }
    return `${value.toFixed(value < 10 ? 1 : 0)} km away`;
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
    const charity = getCharityById(post.charityId);
    if (!charity) return null;

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
          charity={charity}
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
        message={`Try expanding your search radius to see more charity updates within ${distance} km.`}
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
          subtitle: `Charity stories within ${distance} km of you`
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
              color={isActive ? '#FFFFFF' : '#3B82F6'}
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
        <Text style={styles.distanceLabel}>
          Showing charities within {distance} km
        </Text>
        <View style={styles.distanceControls}>
          <TouchableOpacity
            style={styles.distanceButton}
            onPress={() => handleDistanceChange(-DISTANCE_STEP)}
          >
            <Ionicons name="remove-outline" size={18} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.distanceValue}>{distance} km</Text>
          <TouchableOpacity
            style={styles.distanceButton}
            onPress={() => handleDistanceChange(DISTANCE_STEP)}
          >
            <Ionicons name="add-outline" size={18} color="#1F2937" />
          </TouchableOpacity>
        </View>
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
            tintColor="#3B82F6"
          />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
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
    borderColor: '#3B82F6',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
  },
  tabButtonActive: {
    backgroundColor: '#3B82F6',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
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