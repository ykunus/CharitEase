import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const CreatePostScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');

  const handlePost = () => {
    // TODO: Save post to database
    console.log('Posting:', { title: postTitle, content: postContent });
    navigation.goBack();
  };

  const characterCount = postContent.length;
  const maxCharacters = 3000;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create post</Text>
          <TouchableOpacity 
            onPress={handlePost}
            disabled={!postContent.trim()}
            style={[
              styles.postButton,
              !postContent.trim() && styles.postButtonDisabled
            ]}
          >
            <Text style={[
              styles.postButtonText,
              !postContent.trim() && styles.postButtonTextDisabled
            ]}>
              Post
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView}>
          {/* User Profile Section */}
          <View style={styles.userSection}>
            <Image 
              source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' }}
              style={styles.avatar}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || 'Your Name'}</Text>
              <Text style={styles.userType}>Charity</Text>
            </View>
          </View>

          {/* Post Title Input */}
          <TextInput
            style={styles.titleInput}
            placeholder="Add a title (optional)"
            placeholderTextColor="#9CA3AF"
            value={postTitle}
            onChangeText={setPostTitle}
            multiline
            maxLength={100}
          />

          {/* Post Content Input */}
          <TextInput
            style={styles.contentInput}
            placeholder="What do you want to share?"
            placeholderTextColor="#9CA3AF"
            value={postContent}
            onChangeText={setPostContent}
            multiline
            textAlignVertical="top"
            maxLength={maxCharacters}
          />

          {/* Character Count */}
          <Text style={styles.characterCount}>
            {characterCount}/{maxCharacters}
          </Text>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="image-outline" size={24} color="#22C55E" />
              <Text style={styles.actionText}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="videocam-outline" size={24} color="#22C55E" />
              <Text style={styles.actionText}>Video</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  postButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#22C55E',
    borderRadius: 20,
  },
  postButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  postButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  postButtonTextDisabled: {
    color: '#9CA3AF',
  },
  scrollView: {
    flex: 1,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  userType: {
    fontSize: 14,
    color: '#6B7280',
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 50,
  },
  contentInput: {
    fontSize: 16,
    color: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 200,
    lineHeight: 24,
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#22C55E',
  },
});

export default CreatePostScreen;

