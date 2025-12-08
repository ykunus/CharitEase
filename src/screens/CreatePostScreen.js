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
  Image,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

const CreatePostScreen = ({ navigation }) => {
  const { user, createPost } = useAuth();
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [posting, setPosting] = useState(false);

  // Reset posting state when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      setPosting(false);
      return () => {
        // Cleanup when screen loses focus
        setPosting(false);
      };
    }, [])
  );

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your photos to add images to posts.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const handlePost = async () => {
    if (!postContent.trim() || posting) return;

    setPosting(true);
    try {
      await createPost(postTitle, postContent, selectedImage, 'update');
      
      // Reset form
      setPostContent('');
      setPostTitle('');
      setSelectedImage(null);
      setPosting(false); // Reset posting state before navigation
      
      // Navigate back (posts will auto-refresh via context)
      navigation.goBack();
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', error.message || 'Failed to create post. Please try again.');
      setPosting(false);
    } finally {
      // Always reset posting state, even if navigation fails
      setPosting(false);
    }
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
            disabled={!postContent.trim() || posting}
            style={[
              styles.postButton,
              (!postContent.trim() || posting) && styles.postButtonDisabled
            ]}
          >
            <Text style={[
              styles.postButtonText,
              (!postContent.trim() || posting) && styles.postButtonTextDisabled
            ]}>
              {posting ? 'Posting...' : 'Post'}
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
              <Text style={styles.userType}>
                {user?.userType === 'charity' ? 'Charity' : 'User'}
              </Text>
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

          {/* Selected Image Preview */}
          {selectedImage && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={removeImage}
              >
                <Ionicons name="close-circle" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Character Count */}
          <Text style={styles.characterCount}>
            {characterCount}/{maxCharacters}
          </Text>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={pickImage}
            >
              <Ionicons name="image-outline" size={24} color="#22C55E" />
              <Text style={styles.actionText}>Add Photo</Text>
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
  imagePreviewContainer: {
    position: 'relative',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 14,
  },
});

export default CreatePostScreen;

