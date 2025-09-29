import React, { useState, useCallback } from 'react';
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
import PostCard from '../components/PostCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const FeedScreen = ({ navigation }) => {
  const { getFollowedCharitiesPosts, getCharityById, likePost } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const posts = getFollowedCharitiesPosts();

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

  const renderPost = ({ item: post }) => {
    const charity = getCharityById(post.charityId);
    if (!charity) return null;

    return (
      <PostCard
        post={post}
        charity={charity}
        onLike={handleLike}
        onComment={() => handleComment(post)}
        onShare={() => handleShare(post)}
        onCharityPress={handleCharityPress}
      />
    );
  };

  const renderEmpty = () => (
    <EmptyState
      icon="heart-outline"
      title="No posts yet"
      message="Follow some charities to see their updates in your feed!"
      actionText="Browse Charities"
      onAction={() => navigation.navigate('Charities')}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Your Feed</Text>
      <Text style={styles.headerSubtitle}>
        Updates from charities you follow
      </Text>
    </View>
  );

  if (loading) {
    return <LoadingSpinner text="Loading your feed..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={posts}
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
        contentContainerStyle={posts.length === 0 ? styles.emptyContainer : styles.contentContainer}
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
});

export default FeedScreen;
