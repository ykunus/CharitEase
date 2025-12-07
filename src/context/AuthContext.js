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
  const [followedUsers, setFollowedUsers] = useState([]); // Track followed users
  const [isConnected, setIsConnected] = useState(false);
  const [likedPosts, setLikedPosts] = useState([]); // Track posts user has liked
  const [comments, setComments] = useState({}); // Track comments by post ID

  // Check for existing session on app start
  useEffect(() => {
    checkAuthState();
    testSupabaseConnection();
    loadCharitiesFromDatabase();
    loadPostsFromDatabase();
  }, []);

  const checkAuthState = async () => {
    try {
      console.log('🔄 Checking auth state...');
      
      // Check for active Supabase session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session && session.user) {
        console.log('✅ Active Supabase session found');
        await loadUserProfile(session.user);
        setIsConnected(true);
      } else {
        // Fallback to AsyncStorage for demo user
        console.log('⚠️ No Supabase session, checking local storage...');
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
          setIsConnected(false);
        
        console.log('✅ Demo user loaded from storage');
      } else {
          console.log('ℹ️ No user found');
        }
      }
    } catch (error) {
      console.log('Auth check error:', error);
      // Try fallback to demo user
      const demoUser = await AsyncStorage.getItem('demoUser');
      if (demoUser) {
        const parsed = JSON.parse(demoUser);
        setUser(parsed);
        setFollowedCharities(parsed.followedCharities || []);
        setIsAuthenticated(true);
        setIsConnected(false);
      }
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
          // Ensure charity has a corresponding entry in users table for likes/comments
          // Check if user entry exists and load followed_charities
          let userDbId = null;
          let charityFollowedList = [];
          const { data: existingUser } = await supabase
            .from('users')
            .select('id, followed_charities, followed_users')
            .eq('email', supabaseUser.email)
            .single();
          
          if (existingUser) {
            userDbId = existingUser.id;
            // Load followed charities from users table
            charityFollowedList = Array.isArray(existingUser.followed_charities) 
              ? existingUser.followed_charities 
              : [];
            // Load followed users if column exists
            const userFollowedList = Array.isArray(existingUser.followed_users) 
              ? existingUser.followed_users 
              : [];
            setFollowedUsers(userFollowedList);
            console.log('✅ Found existing user entry for charity');
            console.log(`✅ Loaded ${charityFollowedList.length} followed charities and ${userFollowedList.length} followed users for charity`);
          } else {
            // Create user entry for charity to enable likes/comments
            // Note: posts column doesn't exist in users table (posts are tracked differently)
            const { data: newUser, error: userError } = await supabase
              .from('users')
              .insert([{
                email: supabaseUser.email,
                name: charityProfile.name,
                country: charityProfile.country,
                user_type: 'charity',
                avatar_url: charityProfile.logo_url,
                total_donated: 0,
                total_donations: 0,
                followed_charities: []
                // posts field removed - not a column in users table
              }])
              .select('id')
              .single();
            
            if (userError) {
              console.error('❌ Failed to create user entry for charity:', userError);
              // Try to get it again in case it was created by another process
              const { data: retryUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', supabaseUser.email)
                .single();
              if (retryUser) {
                userDbId = retryUser.id;
                console.log('✅ Found user entry on retry');
              } else {
                throw new Error('Failed to create or find user entry for charity. Cannot proceed.');
              }
            } else if (newUser) {
              userDbId = newUser.id;
              console.log('✅ Created user entry for charity');
            } else {
              throw new Error('Failed to create user entry for charity. Cannot proceed.');
            }
          }

          // Ensure we have a valid users table ID
          if (!userDbId) {
            throw new Error('No valid users table ID found for charity. Cannot proceed.');
          }

          // Load charity's posts - query by charity_id (posts array column doesn't exist)
          let charityPosts = [];
          const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select('*')
            .eq('charity_id', charity.id)
            .order('created_at', { ascending: false });
          
          if (!postsError && postsData && postsData.length > 0) {
            // Get accurate likes and comments counts from database
            const postIds = postsData.map(p => p.id);
            
            // Get likes count per post
            const { data: likesData } = await supabase
              .from('likes')
              .select('post_id')
              .in('post_id', postIds);
            
            // Get comments count per post
            const { data: commentsData } = await supabase
              .from('comments')
              .select('post_id')
              .in('post_id', postIds);
            
            // Count likes and comments per post
            const likesCount = {};
            const commentsCount = {};
            
            if (likesData) {
              likesData.forEach(like => {
                likesCount[like.post_id] = (likesCount[like.post_id] || 0) + 1;
              });
            }
            
            if (commentsData) {
              commentsData.forEach(comment => {
                commentsCount[comment.post_id] = (commentsCount[comment.post_id] || 0) + 1;
              });
            }
            
            charityPosts = postsData.map(post => ({
              id: post.id,
              charityId: post.charity_id,
              userId: post.user_id || null,
              type: post.type,
              title: post.title,
              content: post.content,
              image: post.image_url,
              likes: likesCount[post.id] || 0, // Use actual count from likes table
              comments: commentsCount[post.id] || 0, // Use actual count from comments table
              shares: post.shares_count || 0,
              timestamp: post.created_at
            }));
          }
          
          setUser({
            id: userDbId, // Use users table ID for likes/comments (required, no fallback)
            dbId: userDbId, // Store the users table ID separately
            email: supabaseUser.email,
            name: charityProfile.name,
            country: charityProfile.country,
            bio: charityProfile.mission || '',
            avatar: charityProfile.logo_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
            totalDonated: 0, // Charities don't donate
            totalDonations: 0,
            followedCharities: charityFollowedList, // Load from users table
            posts: charityPosts,
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
          
          // Set followed charities state for charity accounts
          setFollowedCharities(charityFollowedList);
          
          // Load charity's liked posts using the users table ID
          if (userDbId) {
            const { data: charityLikes, error: likesError } = await supabase
              .from('likes')
              .select('post_id')
              .eq('user_id', userDbId);
            
            if (!likesError && charityLikes) {
              const likedPostIds = charityLikes.map(like => like.post_id);
              setLikedPosts(likedPostIds);
              console.log(`✅ Loaded ${likedPostIds.length} liked posts`);
            }
          }
          
          console.log(`✅ Loaded ${charityPosts.length} posts for charity`);
        }
      } else {
        // Load regular user profile
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', supabaseUser.email)
          .single();

        if (profile) {
          const followedList = Array.isArray(profile.followed_charities) 
            ? profile.followed_charities 
            : [];
          const followedUsersList = Array.isArray(profile.followed_users) 
            ? profile.followed_users 
            : [];
          setFollowedUsers(followedUsersList);
          
          // Load user's posts if they have any
          let userPosts = [];
          if (profile.posts && Array.isArray(profile.posts) && profile.posts.length > 0) {
            const { data: postsData, error: postsError } = await supabase
              .from('posts')
              .select('*')
              .in('id', profile.posts)
              .order('created_at', { ascending: false });
            
            if (!postsError && postsData) {
              userPosts = postsData.map(post => ({
                id: post.id,
                charityId: post.charity_id,
                userId: post.user_id || null,
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
          
          setUser({
            id: profile.id, // Use users table ID for likes/comments
            email: supabaseUser.email,
            name: profile.name,
            country: profile.country,
            bio: profile.bio || '',
            avatar: profile.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
            totalDonated: profile.total_donated || 0,
            totalDonations: profile.total_donations || 0,
            followedCharities: followedList,
            posts: userPosts,
            joinedDate: profile.created_at || new Date().toISOString(),
            userType: 'user'
          });
          
          // Set followed charities state
          setFollowedCharities(followedList);
          setIsAuthenticated(true);
          setIsConnected(true);
          
          // Load user's liked posts using the users table ID
          const { data: userLikes, error: likesError } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', profile.id);
          
          if (!likesError && userLikes) {
            const likedPostIds = userLikes.map(like => like.post_id);
            setLikedPosts(likedPostIds);
            console.log(`✅ Loaded ${likedPostIds.length} liked posts`);
          }
          
          console.log(`✅ Loaded ${followedList.length} followed charities and ${userPosts.length} posts from database`);
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
              id: createdProfile.id, // Use users table ID for likes/comments
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
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error) {
        console.log('⚠️ Supabase connection failed:', error.message);
      setIsConnected(false);
      return false;
      }
      
      console.log('✅ Supabase connected successfully!');
      setIsConnected(true);
      return true;
    } catch (err) {
      console.log('⚠️ Supabase connection failed - using demo data');
      console.log('Error:', err.message);
      setIsConnected(false);
      return false;
    }
  };

  const loadCharitiesFromDatabase = async () => {
    try {
      console.log('🔄 Loading charities from database...');
      const { data: charitiesFromDB, error } = await supabase
        .from('charities')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.log('⚠️ Failed to load charities:', error.message);
        return;
      }
      
      if (charitiesFromDB && charitiesFromDB.length > 0) {
        // Load posts for each charity - query by charity_id (posts array column doesn't exist)
        const charityPostsMap = {};
        const charityIds = charitiesFromDB.map(c => c.id);
        
        // Load all posts for these charities in one query
        const { data: allCharityPosts, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .in('charity_id', charityIds)
          .order('created_at', { ascending: false });
        
        if (!postsError && allCharityPosts && allCharityPosts.length > 0) {
          // Get accurate likes and comments counts from database
          const postIds = allCharityPosts.map(p => p.id);
          
          // Get likes count per post
          const { data: likesData } = await supabase
            .from('likes')
            .select('post_id')
            .in('post_id', postIds);
          
          // Get comments count per post
          const { data: commentsData } = await supabase
            .from('comments')
            .select('post_id')
            .in('post_id', postIds);
          
          // Count likes and comments per post
          const likesCount = {};
          const commentsCount = {};
          
          if (likesData) {
            likesData.forEach(like => {
              likesCount[like.post_id] = (likesCount[like.post_id] || 0) + 1;
            });
          }
          
          if (commentsData) {
            commentsData.forEach(comment => {
              commentsCount[comment.post_id] = (commentsCount[comment.post_id] || 0) + 1;
            });
          }
          
          // Group posts by charity_id with accurate counts
          allCharityPosts.forEach(post => {
            if (post.charity_id && !charityPostsMap[post.charity_id]) {
              charityPostsMap[post.charity_id] = [];
            }
            if (post.charity_id) {
              charityPostsMap[post.charity_id].push({
                id: post.id,
                charityId: post.charity_id,
                userId: post.user_id || null,
                type: post.type,
                title: post.title,
                content: post.content,
                image: post.image_url,
                likes: likesCount[post.id] || 0, // Use actual count from likes table
                comments: commentsCount[post.id] || 0, // Use actual count from comments table
                shares: post.shares_count || 0,
                timestamp: post.created_at
              });
            }
          });
        }

        // Transform database format to app format
        const formattedCharities = charitiesFromDB.map(charity => ({
          id: charity.id,
          name: charity.name,
          category: charity.category,
          country: charity.country,
          email: charity.email,
          location: {
            city: charity.country,
            country: charity.country,
            latitude: 0,
            longitude: 0
          },
          founded: charity.founded_year,
          verified: charity.verified,
          logo: charity.logo_url,
          coverImage: charity.cover_image_url,
          mission: charity.mission,
          website: charity.website,
          phone: charity.phone,
          address: charity.address,
          totalRaised: charity.total_raised || 0,
          followers: charity.followers || 0,
          impact: charity.impact || {},
          posts: charityPostsMap[charity.id] || []
        }));
        
        setCharitiesData(formattedCharities);
        console.log(`✅ Loaded ${formattedCharities.length} charities from database`);
      } else {
        console.log('ℹ️ No charities found in database');
      }
    } catch (err) {
      console.log('⚠️ Error loading charities:', err.message);
    }
  };

  const loadPostsFromDatabase = async () => {
    try {
      console.log('🔄 Loading posts from database...');
      const { data: postsFromDB, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
        console.log('⚠️ Failed to load posts:', error.message);
        return;
      }
      
      if (postsFromDB && postsFromDB.length > 0) {
        // Get actual likes and comments counts from database
        const postIds = postsFromDB.map(p => p.id);
        
        // Get likes count per post
        const { data: likesData } = await supabase
          .from('likes')
          .select('post_id')
          .in('post_id', postIds);
        
        // Get comments count per post
        const { data: commentsData } = await supabase
          .from('comments')
          .select('post_id')
          .in('post_id', postIds);
        
        // Count likes and comments per post
        const likesCount = {};
        const commentsCount = {};
        
        if (likesData) {
          likesData.forEach(like => {
            likesCount[like.post_id] = (likesCount[like.post_id] || 0) + 1;
          });
        }
        
        if (commentsData) {
          commentsData.forEach(comment => {
            commentsCount[comment.post_id] = (commentsCount[comment.post_id] || 0) + 1;
          });
        }
        
        // For user posts (charity_id is null), find which user created them
        // Use user_id column from posts table if available, otherwise query users
        const userPostsMap = {};
        const userPostsIds = postsFromDB.filter(p => !p.charity_id).map(p => p.id);
        
        if (userPostsIds.length > 0) {
          // Method 1: If posts table has user_id column, use it directly
          // Check if any posts have user_id (column might not exist yet)
          const postsWithUserId = postsFromDB.filter(p => !p.charity_id && p.user_id);
          if (postsWithUserId.length > 0) {
            const userIds = [...new Set(postsWithUserId.map(p => p.user_id).filter(Boolean))];
            if (userIds.length > 0) {
              const { data: usersData } = await supabase
                .from('users')
                .select('id, name, avatar_url')
                .in('id', userIds);
              
              if (usersData) {
                const userMap = {};
                usersData.forEach(u => {
                  userMap[u.id] = { userId: u.id, userName: u.name, userAvatar: u.avatar_url };
                });
                
                postsWithUserId.forEach(post => {
                  if (post.user_id && userMap[post.user_id]) {
                    userPostsMap[post.id] = userMap[post.user_id];
                  }
                });
              }
            }
          }
          
          // Method 2: For posts without user_id (column doesn't exist or legacy posts)
          const postsWithoutUserId = postsFromDB.filter(p => !p.charity_id && !p.user_id);
          if (postsWithoutUserId.length > 0) {
            console.log(`⚠️ ${postsWithoutUserId.length} user posts don't have user_id - please run the migration to add user_id column`);
            // These posts won't show user names until user_id column is added and populated
          }
        }
        
        // Transform database format to app format
        // First, batch fetch user info for any posts with user_id that we haven't loaded yet
        const postsNeedingUserInfo = postsFromDB.filter(p => 
          !p.charity_id && 
          p.user_id && 
          !userPostsMap[p.id]
        );
        
        if (postsNeedingUserInfo.length > 0) {
          const missingUserIds = [...new Set(postsNeedingUserInfo.map(p => p.user_id).filter(Boolean))];
          if (missingUserIds.length > 0) {
            const { data: missingUsersData } = await supabase
              .from('users')
              .select('id, name, avatar_url')
              .in('id', missingUserIds);
            
            if (missingUsersData) {
              const missingUserMap = {};
              missingUsersData.forEach(u => {
                missingUserMap[u.id] = { userId: u.id, userName: u.name, userAvatar: u.avatar_url };
              });
              
              postsNeedingUserInfo.forEach(post => {
                if (post.user_id && missingUserMap[post.user_id]) {
                  userPostsMap[post.id] = missingUserMap[post.user_id];
                }
              });
            }
          }
        }
        
        // Now transform all posts
        const formattedPosts = postsFromDB.map(post => {
          // Get user info from map (if we found it via user_id lookup)
          const userPostInfo = userPostsMap[post.id];
          
          return {
            id: post.id,
            charityId: post.charity_id,
            userId: userPostInfo?.userId || post.user_id || null, // Use user_id from post directly or from map
            userName: userPostInfo?.userName || null, // Store user name for display
            userAvatar: userPostInfo?.userAvatar || null, // Store user avatar for display
            type: post.type,
            title: post.title,
            content: post.content,
            image: post.image_url,
            likes: likesCount[post.id] || 0, // Use actual count from likes table
            comments: commentsCount[post.id] || 0, // Use actual count from comments table
            shares: post.shares_count || 0,
            timestamp: post.created_at
          };
        });
        
        setPosts(formattedPosts);
        const userPostsCount = formattedPosts.filter(p => p.charityId === null).length;
        const charityPostsCount = formattedPosts.filter(p => p.charityId !== null).length;
        console.log(`✅ Loaded ${formattedPosts.length} posts from database (${userPostsCount} user posts, ${charityPostsCount} charity posts)`);
      } else {
        console.log('ℹ️ No posts found in database');
      }
    } catch (err) {
      console.log('⚠️ Error loading posts:', err.message);
    }
  };

  const signUp = async ({ email, password, name, country, userType, ...additionalData }) => {
    try {
      console.log('🔄 Creating account with Supabase...');
      
      // Create auth user with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
        name: userType === 'charity' ? (additionalData.charityName || name) : name,
        country,
        userType,
            ...additionalData
          }
        }
      });

      if (authError) {
        console.error('Supabase signup error:', authError);
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Account creation failed - no user returned');
      }

      console.log('✅ Supabase auth user created');

      // Create profile based on user type
      if (userType === 'charity') {
        // Create charity profile
        // Handle logo URL - use provided avatarUrl or default
        const logoUrl = additionalData.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face';
        
        const charityProfile = {
          email: email,
          name: additionalData.charityName || name,
          category: additionalData.category || 'Education',
          country: country,
          founded_year: additionalData.foundedYear || new Date().getFullYear(),
          verified: false,
          logo_url: logoUrl,
          cover_image_url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=200&fit=crop',
          mission: additionalData.mission || '',
          website: additionalData.website || '',
          phone: additionalData.phone || '',
          address: additionalData.address || (additionalData.location?.address || ''),
          total_raised: 0,
          followers: 0,
          impact: {}
          // posts field removed - not a column in charities table
        };

        const { data: charity, error: charityError } = await supabase
          .from('charities')
          .insert([charityProfile])
          .select()
          .single();

        if (charityError) {
          console.error('Charity profile creation error:', charityError);
          throw new Error('Failed to create charity profile: ' + charityError.message);
        }

        console.log('✅ Charity profile created in database');

        // Also create a user entry for likes/comments
        const charityUserEntry = {
          email: email,
          name: additionalData.charityName || name,
          country: country,
          user_type: 'charity',
          avatar_url: logoUrl, // Use same logo as charity
          total_donated: 0,
          total_donations: 0,
          followed_charities: []
          // posts field removed - not a column in users table
        };

        const { error: userEntryError } = await supabase
          .from('users')
          .insert([charityUserEntry]);

        if (userEntryError) {
          console.log('⚠️ Could not create user entry for charity (may already exist):', userEntryError.message);
        } else {
          console.log('✅ Created user entry for charity (enables likes/comments)');
        }

        // Add to local charities list
        // Use location data if provided, otherwise default
        const locationInfo = additionalData.location || {
          latitude: 0,
          longitude: 0,
          city: charity.country,
          country: charity.country
        };
        
        const newCharity = {
          id: charity.id,
          name: charity.name,
          category: charity.category,
          country: charity.country,
          location: {
            city: locationInfo.city || charity.country,
            country: locationInfo.country || charity.country,
            latitude: locationInfo.latitude || 0,
            longitude: locationInfo.longitude || 0
          },
          founded: charity.founded_year,
          verified: charity.verified,
          logo: charity.logo_url,
          coverImage: charity.cover_image_url,
          mission: charity.mission,
          website: charity.website,
          phone: charity.phone,
          address: charity.address,
          totalRaised: charity.total_raised,
          followers: charity.followers,
          impact: charity.impact
        };
        
        setCharitiesData(prev => [...prev, newCharity]);
        console.log('✅ New charity added to local charities list');
      } else {
        // Create user profile
        // Handle avatar URL - use provided avatarUrl or default
        const avatarUrl = additionalData.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face';
        
        const userProfile = {
          email: email,
          name: name,
          country: country,
          bio: additionalData.bio || '',
          avatar_url: avatarUrl,
          total_donated: 0,
          total_donations: 0,
          user_type: 'user'
          // posts field removed - not a column in users table
        };

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .insert([userProfile])
          .select()
          .single();

        if (profileError) {
          console.error('User profile creation error:', profileError);
          throw new Error('Failed to create user profile: ' + profileError.message);
        }

        console.log('✅ User profile created in database');
      }

      // Load the user profile
      await loadUserProfile(authData.user);
      setIsConnected(true);

      console.log('✅ Account created successfully!');
      return { user: authData.user };
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const signIn = async ({ email, password }) => {
    try {
      console.log('🔄 Signing in with Supabase...');
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error('Supabase signin error:', authError);
        throw new Error(authError.message);
      }

      if (!authData.user || !authData.session) {
        throw new Error('Sign in failed - no user session');
      }

      console.log('✅ Supabase auth successful');

      // Load user profile from database
      await loadUserProfile(authData.user);
      setIsConnected(true);
      
      console.log('✅ Sign in successful!');
      return { user: authData.user };
    } catch (error) {
      console.error('Signin error:', error);
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

  const followCharity = async (charityId) => {
    const currentFollowed = Array.isArray(followedCharities) ? followedCharities : [];
      const isFollowing = currentFollowed.includes(charityId);
      const updatedFollowed = isFollowing
        ? currentFollowed.filter((id) => id !== charityId)
        : [...currentFollowed, charityId];

    // Update local state immediately
    setFollowedCharities(updatedFollowed);
      setUser((prevUser) => {
        if (!prevUser) return prevUser;
      return {
        ...prevUser,
        followedCharities: updatedFollowed
      };
    });

    // Save to database if user is connected
    if (isConnected && user && user.id) {
      try {
        // Convert UUID strings to UUID format for database
        const charityUuids = updatedFollowed.map(id => {
          // If ID is already a UUID string, use it; otherwise try to convert
          return typeof id === 'string' ? id : String(id);
        });

        // Update using user.id (users table ID) for better reliability
        // This works for both regular users and charities
        const { error } = await supabase
          .from('users')
          .update({ followed_charities: charityUuids })
          .eq('id', user.id); // Use ID instead of email for more reliable updates

        if (error) {
          console.error('Failed to update followed charities in database:', error);
          // Rollback local state on error
          setFollowedCharities(currentFollowed);
        } else {
          console.log('✅ Followed charities updated in database');
          
          // Update charity's follower count in charities table
          if (charityId) {
            // Get current follower count
            const { data: charityData, error: charityFetchError } = await supabase
              .from('charities')
              .select('followers')
              .eq('id', charityId)
              .single();

            if (!charityFetchError && charityData) {
              const currentFollowers = parseInt(charityData.followers || 0);
              const newFollowers = isFollowing ? Math.max(0, currentFollowers - 1) : currentFollowers + 1;
              
              const { error: updateError } = await supabase
                .from('charities')
                .update({ followers: newFollowers })
                .eq('id', charityId);

              if (updateError) {
                console.log('Note: Could not update charity follower count:', updateError.message);
              } else {
                console.log('✅ Charity follower count updated in database');
              }
            }
          }
        }
      } catch (err) {
        console.error('Error updating followed charities:', err);
        // Rollback local state on error
        setFollowedCharities(currentFollowed);
      }
    }
  };

  const followUser = async (userId) => {
    const currentFollowed = Array.isArray(followedUsers) ? followedUsers : [];
    const isFollowing = currentFollowed.includes(userId);
    const updatedFollowed = isFollowing
      ? currentFollowed.filter((id) => id !== userId)
      : [...currentFollowed, userId];

    // Update local state immediately
    setFollowedUsers(updatedFollowed);
    setUser((prevUser) => {
      if (!prevUser) return prevUser;
        return {
          ...prevUser,
        followedUsers: updatedFollowed
        };
      });

    // Save to database if user is connected
    // Note: This requires a followed_users column in the users table
    // For now, we'll store it locally and can add database support later
    if (isConnected && user && user.id) {
      try {
        // Convert UUID strings to UUID format for database
        const userUuids = updatedFollowed.map(id => {
          return typeof id === 'string' ? id : String(id);
        });

        // Try to update followed_users column (if it exists)
        // If the column doesn't exist, we'll just store it locally
        const { error } = await supabase
          .from('users')
          .update({ followed_users: userUuids })
          .eq('id', user.id);

        if (error) {
          // Column might not exist yet - that's okay, we'll store locally
          console.log('⚠️ followed_users column may not exist, storing locally only');
        } else {
          console.log('✅ Followed users updated in database');
        }
      } catch (err) {
        console.log('⚠️ Error updating followed users (storing locally only):', err);
        // Don't rollback - keep local state even if DB update fails
      }
    }
  };

  const makeDonation = async (charityId, amount, message) => {
    try {
      if (!user || !user.id) {
        throw new Error('You must be logged in to make a donation');
      }

      console.log('🔄 Creating donation in database...');

      // Create donation in database
      const donationData = {
        user_id: user.id,
        charity_id: charityId,
        amount: amount,
        message: message || null,
        status: 'completed'
      };

      const { data: newDonation, error: donationError } = await supabase
        .from('donations')
        .insert([donationData])
        .select()
        .single();

      if (donationError) {
        console.error('Donation creation error:', donationError);
        throw new Error('Failed to create donation: ' + donationError.message);
      }

      console.log('✅ Donation created in database');

      // Update user's total_donated in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          total_donated: (user.totalDonated || 0) + amount,
          total_donations: (user.totalDonations || 0) + 1
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating user total_donated:', updateError);
        // Continue anyway - donation was created successfully
      } else {
        console.log('✅ User total_donated updated in database');
      }

      // Update charity's total_raised in database
      // First get current total_raised
      const { data: charityData, error: charityFetchError } = await supabase
        .from('charities')
        .select('total_raised')
        .eq('id', charityId)
        .single();

      if (!charityFetchError && charityData) {
        const currentTotal = parseFloat(charityData.total_raised || 0);
        const { error: charityUpdateError } = await supabase
          .from('charities')
          .update({ 
            total_raised: currentTotal + amount
          })
          .eq('id', charityId);

        if (charityUpdateError) {
          console.log('Note: Could not update charity total_raised:', charityUpdateError.message);
        } else {
          console.log('✅ Charity total_raised updated in database');
        }
      }

      // Format donation for local state
      const formattedDonation = {
        id: newDonation.id,
        charityId: newDonation.charity_id,
        amount: newDonation.amount,
        message: newDonation.message,
        date: newDonation.created_at ? newDonation.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
      };
      
      // Update local state
      setDonations(prev => [formattedDonation, ...prev]);
    setUser(prev => ({
      ...prev,
        totalDonated: (prev.totalDonated || 0) + amount,
        totalDonations: (prev.totalDonations || 0) + 1
      }));

      return formattedDonation;
    } catch (error) {
      console.error('Make donation error:', error);
      throw error;
    }
  };

  const createPost = async (title, content, imageUrl, type = 'update') => {
    try {
      if (!user) {
        throw new Error('You must be logged in to create a post');
      }

      if (!content || !content.trim()) {
        throw new Error('Post content is required');
      }

      console.log('🔄 Creating post in database...');

      let charityId = null;

      // If user is a charity, get their charity ID
      if (user.userType === 'charity') {
        const { data: charityProfile, error: charityError } = await supabase
          .from('charities')
          .select('id')
          .eq('email', user.email)
          .single();

        if (charityError || !charityProfile) {
          throw new Error('Charity profile not found');
        }

        charityId = charityProfile.id;
      }
      // For regular users, charity_id will be NULL (they post as themselves)

      // Create post in database
      // Note: user_id column may not exist yet - we'll try without it first
      const postData = {
        charity_id: charityId, // NULL for user posts
        type: type,
        title: title || null,
        content: content,
        image_url: imageUrl || null,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0
      };
      
      // Try to add user_id if user is a regular user (not charity)
      // If the column doesn't exist, we'll catch the error and retry without it
      if (user.userType === 'user') {
        postData.user_id = user.id;
      }
      
      let { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert([postData])
        .select()
        .single();

      // If error is because user_id column doesn't exist (PGRST204), retry without it
      if (postError && postError.code === 'PGRST204' && postData.user_id) {
        console.log('⚠️ user_id column doesn\'t exist, creating post without it');
        // Remove user_id and try again
        const { user_id, ...postDataWithoutUserId } = postData;
        const retryResult = await supabase
          .from('posts')
          .insert([postDataWithoutUserId])
          .select()
          .single();
        
        if (retryResult.error) {
          console.error('Post creation error (retry):', retryResult.error);
          throw new Error('Failed to create post: ' + retryResult.error.message);
        }
        
        newPost = retryResult.data;
        postError = null;
      } else if (postError) {
        console.error('Post creation error:', postError);
        throw new Error('Failed to create post: ' + postError.message);
      }

      console.log('✅ Post created in database');

      // Format post for app
      // Always include userId, userName, and userAvatar in the formatted post
      // (even if user_id column doesn't exist in DB, we still have this info in app state)
      const formattedPost = {
        id: newPost.id,
        charityId: newPost.charity_id, // NULL for user posts
        userId: user.userType === 'user' ? user.id : null, // Track user ID for user posts (in app state)
        userName: user.userType === 'user' ? user.name : null, // Include user name for immediate display
        userAvatar: user.userType === 'user' ? (user.avatar || user.avatar_url) : null, // Include user avatar
        type: newPost.type,
        title: newPost.title,
        content: newPost.content,
        image: newPost.image_url,
        likes: newPost.likes_count || 0,
        comments: newPost.comments_count || 0,
        shares: newPost.shares_count || 0,
        timestamp: newPost.created_at
      };

      // For charity posts, the charity_id is already set in the post
      // Posts are loaded by querying posts table with charity_id (no posts array column needed)
      
      // Update local user state to include the new post for immediate display
      if (user.userType === 'charity') {
        setUser(prevUser => {
          if (!prevUser) return prevUser;
          const currentPosts = Array.isArray(prevUser.posts) ? prevUser.posts : [];
          return {
            ...prevUser,
            posts: [formattedPost, ...currentPosts]
          };
        });
      }

      // Add to local posts state (prepend to show at top) - no need to reload
      setPosts(prev => [formattedPost, ...prev]);

      // Update user's local posts array so it appears in following feed immediately
      // This is handled above for charities, and here for regular users
      if (user.userType === 'user') {
        setUser(prevUser => {
          if (!prevUser) return prevUser;
          const currentUserPosts = Array.isArray(prevUser.posts) ? prevUser.posts : [];
          return {
            ...prevUser,
            posts: [formattedPost, ...currentUserPosts]
          };
        });
      }

      return formattedPost;
    } catch (error) {
      console.error('Create post error:', error);
      throw error;
    }
  };

  const likePost = async (postId) => {
    if (!user || !user.id) {
      console.log('⚠️ User not logged in, cannot like post');
      return;
    }

    // Ensure we're using the users table ID, not the auth ID
    // user.id should already be the users table ID
    const userId = user.id || user.dbId; // Use dbId as fallback if available
    if (!userId) {
      console.error('⚠️ No user ID available for liking post');
      return;
    }

    // Verify the user ID exists in the users table before attempting to like
    // This prevents foreign key violations
    try {
      const { data: userCheck, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (checkError || !userCheck) {
        console.error('❌ User ID not found in users table:', userId, checkError);
        console.log('⚠️ User object:', { id: user.id, dbId: user.dbId, email: user.email, userType: user.userType });
        // Try to fix by reloading user profile
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('🔄 Attempting to reload user profile to fix ID...');
          await loadUserProfile(session.user);
          console.log('✅ Please try liking the post again');
        }
        return;
      }
    } catch (verifyError) {
      console.error('❌ Error verifying user ID:', verifyError);
      return;
    }

    // Check if user already liked this post
    const isLiked = likedPosts.includes(postId);
    
    try {
      if (isLiked) {
        // Unlike: Remove from database
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', userId)
          .eq('post_id', postId);

        if (error) throw error;

        // Update local state
        setLikedPosts(prev => prev.filter(id => id !== postId));
    setPosts(prev => prev.map(post => 
      post.id === postId 
            ? { ...post, likes: Math.max(0, (post.likes || 0) - 1) }
        : post
    ));
        
        console.log('✅ Post unliked');
      } else {
        // Like: Add to database
        const { error } = await supabase
          .from('likes')
          .insert([{
            user_id: userId,
            post_id: postId
          }]);

        if (error) throw error;

        // Update local state
        setLikedPosts(prev => [...prev, postId]);
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, likes: (post.likes || 0) + 1 }
            : post
        ));
        
        console.log('✅ Post liked');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert local state on error
      // State will be corrected on next refresh
    }
  };

  const addComment = async (postId, content) => {
    if (!user || !user.id) {
      throw new Error('You must be logged in to comment');
    }

    if (!content || !content.trim()) {
      throw new Error('Comment content is required');
    }

    try {
      // Add comment to database
      const { data: newComment, error } = await supabase
        .from('comments')
        .insert([{
          user_id: user.id,
          post_id: postId,
          content: content.trim()
        }])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Comment added to database');

      // Format comment for app
      // user.name and user.avatar are already set correctly for both users and charities
      const formattedComment = {
        id: newComment.id,
        userId: newComment.user_id,
        postId: newComment.post_id,
        content: newComment.content,
        timestamp: newComment.created_at,
        userName: user.name || 'Unknown',
        userAvatar: user.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      };

      // Update comments state
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), formattedComment]
      }));

      // Update post comments count in local state
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, comments: (post.comments || 0) + 1 }
          : post
      ));

      console.log('✅ Comment added');
      return formattedComment;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  const loadCommentsForPost = async (postId) => {
    try {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (commentsData && commentsData.length > 0) {
        // Get user info for each comment
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, avatar_url, email, user_type')
          .in('id', userIds);
        
        const userMap = {};
        if (usersData) {
          usersData.forEach(u => {
            userMap[u.id] = u;
          });
        }

        // Get charity info for charity commenters
        const charityUserIds = usersData?.filter(u => u.user_type === 'charity').map(u => u.id) || [];
        const charityEmails = usersData?.filter(u => u.user_type === 'charity').map(u => u.email) || [];
        const charityMap = {};
        
        if (charityEmails.length > 0) {
          const { data: charitiesData } = await supabase
            .from('charities')
            .select('id, name, logo_url, email')
            .in('email', charityEmails);
          
          if (charitiesData) {
            charitiesData.forEach(charity => {
              // Find the user ID that matches this charity
              const matchingUser = usersData?.find(u => u.email === charity.email && u.user_type === 'charity');
              if (matchingUser) {
                charityMap[matchingUser.id] = {
                  name: charity.name,
                  avatar: charity.logo_url
                };
              }
            });
          }
        }

        const formattedComments = commentsData.map(comment => {
          const commentUser = userMap[comment.user_id];
          const isCharity = commentUser?.user_type === 'charity';
          const charityInfo = charityMap[comment.user_id];
          
          // Use charity info if available, otherwise use user info
          return {
            id: comment.id,
            userId: comment.user_id,
            postId: comment.post_id,
            content: comment.content,
            timestamp: comment.created_at,
            userName: isCharity && charityInfo 
              ? charityInfo.name 
              : (commentUser?.name || 'Unknown'),
            userAvatar: isCharity && charityInfo 
              ? charityInfo.avatar 
              : (commentUser?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face')
          };
        });

        setComments(prev => ({
          ...prev,
          [postId]: formattedComments
        }));

        return formattedComments;
      }
      
      // Set empty array if no comments
      setComments(prev => ({
        ...prev,
        [postId]: []
      }));
      
      return [];
    } catch (error) {
      console.error('Error loading comments:', error);
      return [];
    }
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

  const findUserIdForPost = async (postId) => {
    try {
      // First, try to get user_id directly from the post (if column exists)
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();
      
      // If error is about missing column, that's okay - column doesn't exist yet
      if (postError && postError.code !== '42703') {
        // Column doesn't exist error (42703) is okay, other errors are not
        console.log('Note: user_id column may not exist in posts table yet');
        return null;
      }
      
      if (postData && postData.user_id) {
        // Get user info from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, avatar_url')
          .eq('id', postData.user_id)
          .single();
        
        if (!userError && userData) {
          return {
            userId: userData.id,
            userName: userData.name,
            userAvatar: userData.avatar_url
          };
        }
      }

      // If post doesn't have user_id, return null (can't identify user)
      return null;
    } catch (error) {
      // If error is about missing column, that's expected if migration hasn't run
      if (error.code === '42703') {
        console.log('Note: user_id column doesn\'t exist in posts table - please run migration');
        return null;
      }
      console.error('Error finding user for post:', error);
      return null;
    }
  };

  const loadUserProfileById = async (userId) => {
    try {
      // Validate userId before querying
      if (!userId || userId === 'unknown') {
        return null;
      }
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.error('Invalid userId format in loadUserProfileById:', userId);
        return null;
      }
      
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (userProfile) {
        // Load user's posts - query posts by user_id (preferred method, if column exists)
        let userPosts = [];
        
        // Query posts where user_id matches this user
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        // Check if error is because column doesn't exist (code 42703)
        if (postsError && postsError.code === '42703') {
          // Column doesn't exist - need to run migration
          console.log('⚠️ user_id column doesn\'t exist in posts table - please run migration');
          userPosts = []; // Can't load user posts without user_id column
        } else if (!postsError && postsData && postsData.length > 0) {
          userPosts = postsData.map(post => ({
            id: post.id,
            charityId: post.charity_id,
            userId: post.user_id || userId,
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
        return {
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
      }
      return null;
    } catch (error) {
      console.error('Error loading user profile by ID:', error);
      return null;
    }
  };

  const loadCharityProfileById = async (charityId) => {
    try {
      const { data: charityProfile, error } = await supabase
        .from('charities')
        .select('*')
        .eq('id', charityId)
        .single();

      if (error) throw error;

      if (charityProfile) {
        // Load charity's posts if they have any
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
        return {
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
      }
      return null;
    } catch (error) {
      console.error('Error loading charity profile by ID:', error);
      return null;
    }
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
    likedPosts,
    comments,
    signUp,
    signIn,
    signOut,
    followCharity,
    makeDonation,
    likePost,
    createPost,
    addComment,
    loadCommentsForPost,
    loadPostsFromDatabase,
    getCharityById,
    getFollowedCharitiesData,
    getFollowedCharitiesPosts,
    loadUserProfileById,
    loadCharityProfileById,
    findUserIdForPost,
    testSupabaseConnection
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
