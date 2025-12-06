import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate, getPostTypeIcon, getPostTypeColor } from '../utils/formatters';

const { width } = Dimensions.get('window');

const PostCard = ({ post, charity, onLike, onComment, onShare, onCharityPress, isLiked = false }) => {
  const handleLike = () => {
    if (onLike) {
      onLike(post.id);
    }
  };

  const handleCharityPress = () => {
    if (onCharityPress) {
      onCharityPress(charity);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.charityInfo} onPress={handleCharityPress}>
          <Image source={{ uri: charity.logo }} style={styles.charityLogo} />
          <View style={styles.charityDetails}>
            <Text style={styles.charityName}>{charity.name}</Text>
            <Text style={styles.postTime}>{formatDate(post.timestamp || new Date().toISOString())}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.postTypeContainer}>
          <Text style={styles.postTypeIcon}>{getPostTypeIcon(post.type)}</Text>
          <View style={[styles.postTypeIndicator, { backgroundColor: getPostTypeColor(post.type) }]} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {post.title && (
          <Text style={styles.postTitle}>{post.title}</Text>
        )}
        <Text style={styles.postContent}>{post.content}</Text>
      </View>

      {/* Image */}
      {post.image && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: post.image }} style={styles.postImage} resizeMode="cover" />
        </View>
      )}

      {/* Engagement */}
      <View style={styles.engagement}>
        <TouchableOpacity style={styles.engagementButton} onPress={handleLike}>
          <Ionicons 
            name={isLiked ? "heart" : "heart-outline"} 
            size={20} 
            color={isLiked ? "#EF4444" : "#6B7280"} 
          />
          <Text style={[styles.engagementText, isLiked && styles.engagementTextLiked]}>
            {post.likes || 0}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.engagementButton} onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
          <Text style={styles.engagementText}>{post.comments || 0}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.engagementButton} onPress={onShare}>
          <Ionicons name="share-outline" size={20} color="#6B7280" />
          <Text style={styles.engagementText}>{post.shares || 0}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  charityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  charityLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  charityDetails: {
    flex: 1,
  },
  charityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  postTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  postTypeContainer: {
    alignItems: 'center',
  },
  postTypeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  postTypeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  postContent: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
  },
  imageContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: 300,
    borderRadius: 8,
  },
  engagement: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  engagementText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  engagementTextLiked: {
    color: '#EF4444',
  },
});

export default PostCard;
