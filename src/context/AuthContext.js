import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userProfile, charities, socialPosts, donationHistory } from '../data/demoData';
import { supabase } from '../config/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [charitiesData, setCharitiesData] = useState(charities);
  const [posts, setPosts] = useState(socialPosts);
  const [donations, setDonations] = useState(donationHistory);
  const [followedCharities, setFollowedCharities] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // Check for existing session on app start
  useEffect(() => {
    checkAuthState();
    testSupabaseConnection();
  }, []);

  const checkAuthState = async () => {
    try {
      // Skip Supabase check for demo mode
      console.log('🔄 Checking demo auth state');
      
      // Check AsyncStorage for demo user
      const demoUser = await AsyncStorage.getItem('demoUser');
      if (demoUser) {
        const parsed = JSON.parse(demoUser);
        const fallbackFollowed = Array.isArray(parsed.followedCharities) ? parsed.followedCharities : [];

        setUser({
          ...parsed,
          followedCharities: fallbackFollowed
        });
        setFollowedCharities(fallbackFollowed);
        setIsAuthenticated(true);
        setIsConnected(false); // Demo mode
        
        console.log('✅ Demo user loaded from storage');
      } else {
        console.log('ℹ️ No demo user found');
      }
    } catch (error) {
      console.log('Demo auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async (supabaseUser) => {
    try {
      // Determine user type from metadata
      const userType = supabaseUser.user_metadata?.userType || 'user';
      
      if (userType === 'charity') {
        // Load charity profile
        const { data: charityProfile, error } = await supabase
          .from('charities')
          .select('*')
          .eq('email', supabaseUser.email)
          .single();

        if (charityProfile) {
          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email,
            name: charityProfile.name,
            country: charityProfile.country,
            bio: charityProfile.mission || '',
            avatar: charityProfile.logo_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
            totalDonated: 0, // Charities don't donate
            totalDonations: 0,
            followedCharities: [],
            joinedDate: charityProfile.created_at || new Date().toISOString(),
            userType: 'charity',
            mission: charityProfile.mission || '',
            website: charityProfile.website || '',
            phone: charityProfile.phone || '',
            address: charityProfile.address || '',
            foundedYear: charityProfile.founded_year || new Date().getFullYear(),
            category: charityProfile.category || 'General',
            verified: charityProfile.verified || false,
            totalRaised: charityProfile.total_raised || 0,
            followers: charityProfile.followers || 0
          });
          setIsAuthenticated(true);
          setIsConnected(true);
        }
      } else {
        // Load regular user profile
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', supabaseUser.email)
          .single();

        if (profile) {
          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email,
            name: profile.name,
            country: profile.country,
            bio: profile.bio || '',
            avatar: profile.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
            totalDonated: profile.total_donated || 0,
            totalDonations: profile.total_donations || 0,
            followedCharities: profile.followed_charities || [],
            joinedDate: profile.created_at || new Date().toISOString(),
            userType: 'user'
          });
          setIsAuthenticated(true);
          setIsConnected(true);
        } else {
          // Create profile if it doesn't exist
          const newProfile = {
            email: supabaseUser.email,
            name: supabaseUser.user_metadata?.name || 'User',
            country: supabaseUser.user_metadata?.country || 'Unknown',
            bio: supabaseUser.user_metadata?.bio || '',
            avatar_url: null,
            total_donated: 0,
            total_donations: 0
          };

          const { data: createdProfile, error: createError } = await supabase
            .from('users')
            .insert([newProfile])
            .select()
            .single();

          if (createdProfile) {
            setUser({
              id: supabaseUser.id,
              email: supabaseUser.email,
              name: createdProfile.name,
              country: createdProfile.country,
              bio: createdProfile.bio || '',
              avatar: createdProfile.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
              totalDonated: 0,
              totalDonations: 0,
              followedCharities: [],
              joinedDate: createdProfile.created_at,
              userType: 'user'
            });
            setIsAuthenticated(true);
            setIsConnected(true);
          }
        }
      }
    } catch (error) {
      console.log('Profile load error:', error);
      // Fallback to demo user if database fails
      const demoUser = await AsyncStorage.getItem('demoUser');
      if (demoUser) {
        const parsedUser = JSON.parse(demoUser);
        const fallbackFollowed = Array.isArray(parsedUser.followedCharities)
          ? parsedUser.followedCharities
          : [];

        setUser({
          ...parsedUser,
          followedCharities: fallbackFollowed
        });
        setFollowedCharities(fallbackFollowed);
        setIsAuthenticated(true);
      }
    }
  };

  const testSupabaseConnection = async () => {
    try {
      console.log('🔄 Testing Supabase connection...');
      // Skip Supabase test for demo mode
      console.log('⚠️ Running in demo mode - Supabase disabled');
      setIsConnected(false);
      return false;
    } catch (err) {
      console.log('⚠️ Supabase connection failed - using demo data');
      console.log('Error:', err.message);
      setIsConnected(false);
      return false;
    }
  };

  const signUp = async ({ email, password, name, country, userType, ...additionalData }) => {
    try {
      // Demo mode - skip Supabase and create local user
      console.log('🔄 Creating demo account (Supabase disabled)');
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create demo user data
      const demoUserId = `demo_${Date.now()}`;
      const tempUser = {
        id: demoUserId,
        email,
        name: userType === 'charity' ? (additionalData.charityName || name) : name,
        country,
        bio: additionalData.bio || '',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        totalDonated: 0,
        totalDonations: 0,
        joinedDate: new Date().toISOString(),
        userType,
        followedCharities: [],
        // Charity-specific fields
        ...(userType === 'charity' && {
          mission: additionalData.mission || '',
          website: additionalData.website || '',
          phone: additionalData.phone || '',
          address: additionalData.address || '',
          foundedYear: additionalData.foundedYear || new Date().getFullYear(),
          category: additionalData.category || 'Education',
          verified: false,
          totalRaised: 0,
          followers: 0
        })
      };

      // If creating a charity, add it to the charities list
      if (userType === 'charity') {
        const newCharity = {
          id: demoUserId,
          name: additionalData.charityName || name,
          category: additionalData.category || 'Education',
          country: country,
          location: {
            city: country,
            country: country,
            latitude: 0,
            longitude: 0
          },
          founded: additionalData.foundedYear || new Date().getFullYear(),
          verified: false,
          stripe_account_id: null,
          stripe_onboarding_complete: false,
          charges_enabled: false,
          payouts_enabled: false,
          platform_fee_percent: 2.5,
          logo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
          coverImage: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=200&fit=crop',
          mission: additionalData.mission || '',
          website: additionalData.website || '',
          phone: additionalData.phone || '',
          address: additionalData.address || '',
          totalRaised: 0,
          followers: 0,
          impact: {}
        };
        
        setCharitiesData(prev => [...prev, newCharity]);
        console.log('✅ New charity added to charities list');
      }

      await AsyncStorage.setItem('demoUser', JSON.stringify(tempUser));
      setUser(tempUser);
      setFollowedCharities([]);
      setIsAuthenticated(true);
      setIsConnected(false); // Mark as demo mode

      console.log('✅ Demo account created successfully');
      return { user: tempUser };
    } catch (error) {
      console.error('Demo signup error:', error);
      throw new Error('Failed to create demo account');
    }
  };

  const signIn = async ({ email, password }) => {
    try {
      // Demo mode - check for existing demo user
      console.log('🔄 Demo signin attempt');
      
      const demoUser = await AsyncStorage.getItem('demoUser');
      if (demoUser) {
        const parsedUser = JSON.parse(demoUser);
        if (parsedUser.email === email) {
          setUser(parsedUser);
          setFollowedCharities(parsedUser.followedCharities || []);
          setIsAuthenticated(true);
          setIsConnected(false); // Demo mode
          
          console.log('✅ Demo signin successful');
          return { user: parsedUser };
        }
      }
      
      // If no matching demo user found
      throw new Error('Invalid email or password (demo mode)');
    } catch (error) {
      console.error('Demo signin error:', error);
      throw new Error('Invalid email or password');
    }
  };

  const signOut = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear AsyncStorage
      await AsyncStorage.removeItem('demoUser');
      
      // Reset state
      setUser(null);
      setIsAuthenticated(false);
      setFollowedCharities([]);
      
      console.log('✅ Signed out successfully');
    } catch (error) {
      console.log('Sign out error:', error);
    }
  };

  const followCharity = (charityId) => {
    setFollowedCharities((prev) => {
      const currentFollowed = Array.isArray(prev) ? prev : [];
      const isFollowing = currentFollowed.includes(charityId);
      const updatedFollowed = isFollowing
        ? currentFollowed.filter((id) => id !== charityId)
        : [...currentFollowed, charityId];

      setUser((prevUser) => {
        if (!prevUser) return prevUser;

        const userFollowed = Array.isArray(prevUser.followedCharities)
          ? prevUser.followedCharities
          : [];
        const nextUserFollowed = isFollowing
          ? userFollowed.filter((id) => id !== charityId)
          : [...userFollowed.filter((id) => id !== charityId), charityId];

        return {
          ...prevUser,
          followedCharities: nextUserFollowed
        };
      });

      return updatedFollowed;
    });
  };

  const makeDonation = (charityId, amount, message) => {
    const newDonation = {
      id: `donation${Date.now()}`,
      charityId,
      amount,
      message,
      date: new Date().toISOString().split('T')[0]
    };
    
    setDonations(prev => [newDonation, ...prev]);
    setUser(prev => ({
      ...prev,
      totalDonated: prev.totalDonated + amount,
      totalDonations: prev.totalDonations + 1
    }));
  };

  const likePost = (postId) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, likes: post.likes + 1 }
        : post
    ));
  };

  const getCharityById = (charityId) => {
    return charitiesData.find(charity => charity.id === charityId);
  };

  const getFollowedCharitiesData = () => {
    return charitiesData.filter(charity => followedCharities.includes(charity.id));
  };

  const getFollowedCharitiesPosts = () => {
    return posts.filter(post => followedCharities.includes(post.charityId));
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    charitiesData,
    posts,
    donations,
    followedCharities,
    isConnected,
    signUp,
    signIn,
    signOut,
    followCharity,
    makeDonation,
    likePost,
    getCharityById,
    getFollowedCharitiesData,
    getFollowedCharitiesPosts,
    testSupabaseConnection
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
