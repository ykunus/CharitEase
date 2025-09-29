import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatNumber } from '../utils/formatters';

const CharityCard = ({ charity, isFollowing, onFollow, onPress }) => {
  const handleFollow = () => {
    if (onFollow) {
      onFollow(charity.id);
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress(charity);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      {/* Cover Image */}
      <View style={styles.coverContainer}>
        <Image source={{ uri: charity.coverImage }} style={styles.coverImage} />
        <View style={styles.logoContainer}>
          <Image source={{ uri: charity.logo }} style={styles.logo} />
          {charity.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.charityName} numberOfLines={1}>
            {charity.name}
          </Text>
          <TouchableOpacity
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={handleFollow}
          >
            <Ionicons
              name={isFollowing ? "checkmark" : "add"}
              size={16}
              color={isFollowing ? "#FFFFFF" : "#3B82F6"}
            />
            <Text style={[styles.followText, isFollowing && styles.followingText]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.category}>
          {charity.category} • {charity.country}
        </Text>

        <Text style={styles.mission} numberOfLines={2}>
          {charity.mission}
        </Text>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatNumber(charity.totalRaised)}</Text>
            <Text style={styles.statLabel}>Raised</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatNumber(charity.followers)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{charity.founded}</Text>
            <Text style={styles.statLabel}>Founded</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  coverContainer: {
    position: 'relative',
    height: 120,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  logoContainer: {
    position: 'absolute',
    bottom: -20,
    left: 16,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  content: {
    padding: 16,
    paddingTop: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  charityName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
  },
  followingButton: {
    backgroundColor: '#3B82F6',
  },
  followText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 4,
  },
  followingText: {
    color: '#FFFFFF',
  },
  category: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  mission: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
    marginBottom: 16,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
});

export default CharityCard;
