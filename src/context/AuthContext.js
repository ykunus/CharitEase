import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { charities, socialPosts, donationHistory } from '../data/demoData';
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
        console.log('ℹ️ No active session found');
      }
    } catch (error) {
      console.log('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async (supabaseUser, expectedUserType = null) => {
    try {
      console.log('🔄 Loading user profile for:', supabaseUser.email);
      if (expectedUserType) {
        console.log(`📋 Expected account type: ${expectedUserType}`);
      }
      
      // First, check if this email exists in charities table (most reliable way to detect charity account)
      // Use maybeSingle() to avoid throwing error when not found
      // Normalize email to lowercase for comparison (Supabase queries are case-sensitive)
      const authEmail = supabaseUser.email;
      const normalizedEmail = authEmail?.toLowerCase().trim();
      
      console.log('🔍 Looking for charity profile with:', {
        originalEmail: authEmail,
        normalizedEmail: normalizedEmail
      });
      
      let charityProfile = null;
      let charityCheckError = null;
      
      // Try exact match with normalized email first (this is how we store it)
      const exactMatchResult = await supabase
          .from('charities')
          .select('*')
          .eq('email', normalizedEmail)
          .maybeSingle();
      
      charityProfile = exactMatchResult.data;
      charityCheckError = exactMatchResult.error;
      
      // If not found, try with original email case (in case it was stored differently)
      if (!charityProfile && !charityCheckError && expectedUserType === 'charity') {
        console.log('🔄 Trying with original email case...');
        const originalCaseResult = await supabase
          .from('charities')
          .select('*')
          .eq('email', authEmail)
          .maybeSingle();
        
        if (originalCaseResult.data && !originalCaseResult.error) {
          console.log('✅ Found charity profile with original email case');
          charityProfile = originalCaseResult.data;
        }
      }

      // Check if charity profile exists
      // maybeSingle() returns null for data and null for error when no rows found
      // If there's an actual error, charityCheckError will be set
      let isCharity = !charityCheckError && charityProfile !== null && charityProfile !== undefined;
      
      console.log('🔍 Charity check result (exact match):', { 
        email: supabaseUser.email,
        normalizedEmail: normalizedEmail,
        hasProfile: !!charityProfile,
        profileId: charityProfile?.id,
        profileEmail: charityProfile?.email,
        errorCode: charityCheckError?.code,
        errorMessage: charityCheckError?.message,
        isCharity 
      });
      
      // If not found with exact match and we're expecting a charity, try case-insensitive search as fallback
      if (!isCharity && !charityCheckError && expectedUserType === 'charity') {
        console.log('🔄 Trying case-insensitive charity search...');
        const caseInsensitiveResult = await supabase
          .from('charities')
          .select('*')
          .ilike('email', normalizedEmail)
          .maybeSingle();
        
        if (caseInsensitiveResult.data && !caseInsensitiveResult.error) {
          console.log('✅ Found charity profile with case-insensitive search');
          charityProfile = caseInsensitiveResult.data;
          isCharity = true;
        }
      }
      
      // If there was an actual error (not just "not found"), log it
      if (charityCheckError && charityCheckError.code !== 'PGRST116') {
        console.error('❌ Error checking for charity profile:', charityCheckError);
      }
      
      // Prevent account type mismatch: if expecting a regular user but account is charity
      if (expectedUserType === 'user' && isCharity) {
        throw new Error('This is a charity account. Please use the "Sign In as Charity" option instead.');
      }
      
      // Prevent account type mismatch: if expecting a charity but account is regular user
      if (expectedUserType === 'charity' && !isCharity) {
        // Double check: make sure it's actually a regular user, not just a missing charity
        const { data: userProfile } = await supabase
          .from('users')
          .select('user_type')
          .eq('email', normalizedEmail)
          .maybeSingle();
        
        if (userProfile && userProfile.user_type === 'user') {
          throw new Error('This is a regular user account. Please use the "Sign In as User" option instead.');
        }
        
        // If we're expecting a charity but can't find the charity profile,
        // do a comprehensive search to help debug
        if (!userProfile) {
          console.error('❌ Charity profile not found for email:', supabaseUser.email);
          console.error('❌ Normalized email searched:', normalizedEmail);
          
          // Try to find ANY charity with a similar email (for debugging)
          const { data: allCharities } = await supabase
            .from('charities')
            .select('id, email, name')
            .limit(10);
          
          console.log('🔍 Recent charities in database (for debugging):', 
            allCharities?.map(c => ({ email: c.email, name: c.name })) || 'none'
          );
          
          // Try one more comprehensive search with ilike
          const { data: broadSearch } = await supabase
            .from('charities')
            .select('id, email, name')
            .ilike('email', `%${normalizedEmail.split('@')[0]}%`)
            .limit(5);
          
          if (broadSearch && broadSearch.length > 0) {
            console.log('🔍 Found charities with similar email:', broadSearch);
            console.error('⚠️ Email mismatch detected! Expected:', normalizedEmail, 'Found:', broadSearch[0].email);
          }
          
          throw new Error(`Charity account not found. The charity profile may not have been created during signup, or there's an email mismatch. Please contact support with your email: ${supabaseUser.email}`);
        }
      }
      
      if (isCharity) {
        console.log('✅ Charity profile found, loading as charity account');
        // Check if user entry exists (but DO NOT create one - charities don't need user entries by default)
        // User entries are only created when needed (e.g., when charity likes/comments for the first time)
        let userDbId = null;
        let charityFollowedList = [];
        
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, followed_charities, followed_users, user_type')
          .eq('email', normalizedEmail)
          .maybeSingle(); // Use maybeSingle() to avoid error when not found
        
        if (existingUser && existingUser.user_type === 'charity') {
          // User entry exists from previous setup - use it
          userDbId = existingUser.id;
          charityFollowedList = Array.isArray(existingUser.followed_charities) 
            ? existingUser.followed_charities 
            : [];
          const userFollowedList = Array.isArray(existingUser.followed_users) 
            ? existingUser.followed_users 
            : [];
          setFollowedUsers(userFollowedList);
          console.log('✅ Found existing user entry for charity (from previous setup)');
          console.log(`✅ Loaded ${charityFollowedList.length} followed charities and ${userFollowedList.length} followed users for charity`);
        } else if (existingUser && existingUser.user_type !== 'charity') {
          // User entry exists but it's a regular user, not a charity - this is an error state
          console.error('⚠️ Found user entry with different user_type. This should not happen.');
          console.error('⚠️ Email:', supabaseUser.email, 'User type in DB:', existingUser.user_type);
        } else {
          // No user entry exists - this is NORMAL and EXPECTED for charity accounts
          // User entries are only created when needed (e.g., when charity likes/comments)
          console.log('ℹ️ No user entry found for charity - this is normal. Charity accounts do not require user entries.');
          charityFollowedList = []; // Initialize empty list
        }

          // Load charity's posts - query by charity_id (posts array column doesn't exist)
          let charityPosts = [];
          const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select('*')
            .eq('charity_id', charityProfile.id)
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
            
            // Format posts and add to global posts array (single source of truth)
            const formattedCharityPosts = postsData.map(post => {
              return {
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
              };
            });
            
            // Add/update posts in global posts array (single source of truth)
            setPosts(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const newPosts = formattedCharityPosts.filter(p => !existingIds.has(p.id));
              const updatedPosts = prev.map(p => {
                const updated = formattedCharityPosts.find(up => up.id === p.id);
                return updated || p;
              });
              return [...newPosts, ...updatedPosts];
            });
            
            charityPosts = formattedCharityPosts.map(p => p.id); // Store only IDs
          }
          
          setUser({
            id: userDbId || charityProfile.id, // Use users table ID for likes/comments, fallback to charityProfile.id if not available
            dbId: userDbId, // Store the users table ID separately
            charityId: charityProfile.id, // Store charity ID separately for reference
            email: supabaseUser.email,
            name: charityProfile.name,
            country: charityProfile.country,
            bio: charityProfile.mission || '',
            avatar: charityProfile.logo_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
            totalDonated: 0, // Charities don't donate
            totalDonations: 0,
            followedCharities: charityFollowedList, // Load from users table
            posts: charityPosts, // Now stores only post IDs, not full objects
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
          
          // Make sure we've set everything up correctly
          console.log('✅ Charity account loaded successfully:', {
            email: supabaseUser.email,
            name: charityProfile.name,
            charityId: charityProfile.id,
            userDbId: userDbId || 'none (will be created when needed)'
          });
      } else {
        // Not a charity - load regular user profile
        // BUT FIRST: Check if there's a user entry with user_type='charity'
        // This means the charity check above failed but we have a charity user entry
        // In this case, we should try to load the charity profile again or throw a helpful error
        
        // Load regular user profile (use normalized email for consistency)
        const { data: profile, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', normalizedEmail)
          .single();

        // Check if user was found (PGRST116 means not found)
        const userNotFound = userError && userError.code === 'PGRST116';

        if (profile && !userError) {
          // CRITICAL CHECK: If user_type is 'charity', this is actually a charity account
          // but the charity profile check above failed. This should not happen, but handle it.
          if (profile.user_type === 'charity') {
            console.error('⚠️ Found user entry with user_type=charity but charity profile check failed.');
            console.error('⚠️ This indicates the charity profile might be missing or there was an error.');
            
            // Try one more time to get the charity profile (use normalized email)
            const { data: retryCharityProfile, error: retryError } = await supabase
              .from('charities')
              .select('*')
              .eq('email', normalizedEmail)
              .single();
            
            if (retryCharityProfile && !retryError) {
              console.log('✅ Found charity profile on retry, reloading as charity...');
              // Recursively call loadUserProfile to load as charity
              // But first, we need to make sure we don't loop - use a flag
              // Actually, better to just reload directly here
              // Let's throw an error that tells user to use charity sign-in
              throw new Error('This is a charity account. Please use the "Sign In as Charity" option instead.');
            } else {
              throw new Error('Charity account detected but charity profile is missing. Please contact support.');
            }
          }
          
          const followedList = Array.isArray(profile.followed_charities) 
            ? profile.followed_charities 
            : [];
          const followedUsersList = Array.isArray(profile.followed_users) 
            ? profile.followed_users 
            : [];
          setFollowedUsers(followedUsersList);
          
          // Load user's posts - query by user_id (posts array column doesn't exist)
          let userPosts = [];
          
          // Query posts by user_id
          const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', profile.id)
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
            
            userPosts = postsData.map(post => ({
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
        } else if (userNotFound) {
          // User profile doesn't exist - check if maybe it's a charity account
          // Try one more time to see if charity exists (in case the first check had a different error)
          console.log('⚠️ User profile not found, double-checking if this is a charity account...');
          const { data: doubleCheckCharity, error: doubleCheckError } = await supabase
            .from('charities')
            .select('id, name, email')
            .eq('email', normalizedEmail)
            .maybeSingle(); // Use maybeSingle() to avoid error on no rows
          
          if (doubleCheckCharity && !doubleCheckError) {
            throw new Error('This is a charity account. Please use the "Sign In as Charity" option instead.');
          }
          
          // No charity found either - account truly doesn't exist
          console.error('⚠️ User profile not found in database for sign-in.');
          console.error('⚠️ Email:', supabaseUser.email);
          throw new Error('Account not found. Please make sure you are signing in with the correct account type (User or Charity), or sign up first.');
        } else if (userError) {
          // Some other database error occurred
          console.error('⚠️ Error loading user profile:', userError);
          throw new Error('Failed to load user profile. Please try again.');
        } else {
          // Profile is null but no error - shouldn't happen but handle it
          console.error('⚠️ User profile is null but no error reported.');
          throw new Error('Failed to load user profile. Please try again.');
        }
      }
    } catch (error) {
      console.error('❌ Profile load error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      // Re-throw the error so signIn/signUp can handle it
      throw error;
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
        const formattedCharities = charitiesFromDB.map(charity => {
          // Parse address to extract city if possible, otherwise use country
          let city = charity.country;
          if (charity.address) {
            // Try to extract city from address (format: "City, Region, Country")
            const parts = charity.address.split(',');
            if (parts.length > 0) {
              city = parts[0].trim();
            }
          }
          
          // Check for location coordinates
          // Handle both column names (location_lat/location_lon) and null/undefined values
          const locationLat = charity.location_lat;
          const locationLon = charity.location_lon;
          
          const hasValidLat = typeof locationLat === 'number' && locationLat !== 0 && !isNaN(locationLat) && locationLat !== null;
          const hasValidLon = typeof locationLon === 'number' && locationLon !== 0 && !isNaN(locationLon) && locationLon !== null;
          
          const latitude = hasValidLat ? locationLat : null;
          const longitude = hasValidLon ? locationLon : null;
          
          if (hasValidLat && hasValidLon) {
            console.log(`✅ Loaded location for ${charity.name}: ${latitude}, ${longitude}`);
          } else {
            console.log(`⚠️ No valid location for ${charity.name} (lat: ${locationLat}, lon: ${locationLon})`);
            if (locationLat === undefined || locationLon === undefined) {
              console.log(`⚠️ Location columns may not exist. Run migration: add_location_columns_to_charities.sql`);
            }
          }
          
          return {
            id: charity.id,
            name: charity.name,
            category: charity.category,
            country: charity.country,
            email: charity.email,
            location: {
              city: city,
              country: charity.country,
              latitude: latitude || null, // Use null instead of 0 for missing locations
              longitude: longitude || null // Use null instead of 0 for missing locations
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
          };
        });
        
        // Merge with existing charities data to preserve location data stored in local state
        // (in case location columns don't exist in database yet)
        setCharitiesData(prev => {
          const prevMap = new Map(prev.map(c => [c.id, c]));
          const merged = formattedCharities.map(dbCharity => {
            const existing = prevMap.get(dbCharity.id);
            // If database doesn't have location but local state does, preserve it
            if (existing && 
                existing.location && 
                existing.location.latitude != null && 
                existing.location.longitude != null &&
                existing.location.latitude !== 0 &&
                existing.location.longitude !== 0 &&
                (!dbCharity.location.latitude || 
                 dbCharity.location.latitude === 0 || 
                 dbCharity.location.latitude === null ||
                 !dbCharity.location.longitude ||
                 dbCharity.location.longitude === 0 ||
                 dbCharity.location.longitude === null)) {
              console.log(`🔄 Preserving location for ${dbCharity.name} from local state (DB: ${dbCharity.location.latitude}, ${dbCharity.location.longitude} -> Local: ${existing.location.latitude}, ${existing.location.longitude})`);
              return {
                ...dbCharity,
                location: existing.location // Preserve location from local state
              };
            }
            return dbCharity;
          });
          
          // Add any charities from local state that aren't in database (newly created charities)
          const dbIds = new Set(merged.map(c => c.id));
          const localOnly = prev.filter(c => {
            if (!dbIds.has(c.id)) {
              console.log(`➕ Keeping charity "${c.name}" from local state (not in DB yet or just created)`);
              if (c.location?.latitude && c.location?.longitude) {
                console.log(`   📍 With location: ${c.location.latitude}, ${c.location.longitude}`);
              }
              return true;
            }
            return false;
          });
          
          const result = [...merged, ...localOnly];
          console.log(`📊 Charity merge complete: ${merged.length} from DB + ${localOnly.length} from local = ${result.length} total`);
          
          // Log charities with locations for debugging
          const withLocations = result.filter(c => 
            c.location?.latitude != null && 
            c.location?.longitude != null &&
            c.location.latitude !== 0 &&
            c.location.longitude !== 0
          );
          console.log(`📍 Charities with valid locations: ${withLocations.length}`);
          withLocations.forEach(c => {
            console.log(`   - ${c.name}: ${c.location.latitude}, ${c.location.longitude}`);
          });
          
          return result;
        });
        
        console.log(`✅ Loaded ${formattedCharities.length} charities from database`);
      } else {
        console.log('ℹ️ No charities found in database');
      }
    } catch (err) {
      console.log('⚠️ Error loading charities:', err.message);
    }
  };

  const loadPostsFromDatabase = async (updatedUserInfo = null) => {
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
        // Get current user info to prioritize for their own posts (most up-to-date)
        // Use updatedUserInfo if provided (from profile update), otherwise use current user state
        const currentUserState = updatedUserInfo || user;
        
        const formattedPosts = postsFromDB.map(post => {
          // Get user info from map (if we found it via user_id lookup)
          const userPostInfo = userPostsMap[post.id];
          
          // Determine final user name and avatar
          let finalUserName = userPostInfo?.userName || null;
          let finalUserAvatar = userPostInfo?.userAvatar || null;
          
          // If this post belongs to the current logged-in user, use their current state info
          // This is the most up-to-date (especially if they just updated their profile)
          if (currentUserState && post.user_id && post.user_id === currentUserState.id) {
            finalUserName = currentUserState.name || finalUserName;
            finalUserAvatar = currentUserState.avatar || currentUserState.avatar_url || currentUserState.logo || finalUserAvatar;
          }
          
          return {
            id: post.id,
            charityId: post.charity_id,
            userId: userPostInfo?.userId || post.user_id || null, // Use user_id from post directly or from map
            userName: finalUserName || 'User', // Fallback to 'User' if no name found
            userAvatar: finalUserAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', // Default avatar
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
          },
          // Disable email confirmation for now (can be enabled in Supabase settings)
          emailRedirectTo: undefined
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
      console.log('📧 User email:', authData.user.email);
      console.log('🔐 Session created:', !!authData.session);
      
      // If no session was created, it means email confirmation is enabled in Supabase
      // For development, you should disable email confirmation in Supabase Dashboard:
      // Authentication → Settings → "Enable email confirmations" → OFF
      if (!authData.session) {
        console.error('❌ No session created after signup!');
        console.error('❌ Email confirmation is likely enabled in Supabase settings');
        console.error('❌ To fix: Go to Supabase Dashboard → Authentication → Settings');
        console.error('❌ Turn OFF "Enable email confirmations"');
        throw new Error('Account created but email confirmation is required. Please disable email confirmation in Supabase settings, or check your email to confirm your account.');
      }

      // Create profile based on user type
      if (userType === 'charity') {
        // Create charity profile
        // Handle logo URL - use provided avatarUrl or default
        const logoUrl = additionalData.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face';
        
        // Prepare location data for saving to database
        const locationDataForDb = additionalData.location || null;
        if (locationDataForDb) {
          console.log('📍 Location data received for charity signup:', {
            latitude: locationDataForDb.latitude,
            longitude: locationDataForDb.longitude,
            city: locationDataForDb.city,
            address: locationDataForDb.address
          });
        } else {
          console.log('⚠️ No location data provided for charity signup');
        }
        
        // Use the email from Supabase Auth to ensure exact match
        // Supabase Auth may normalize emails, but we'll normalize it ourselves for consistency
        const authEmail = authData.user.email;
        if (!authEmail) {
          throw new Error('No email address provided by authentication');
        }
        
        // Normalize email to lowercase for consistent storage and queries
        const normalizedEmail = authEmail.toLowerCase().trim();
        
        console.log('📧 Email from signup form:', email);
        console.log('📧 Email from Supabase Auth:', authEmail);
        console.log('📧 Normalized email for storage:', normalizedEmail);
        
        // Ensure we have a valid email
        if (!normalizedEmail || !normalizedEmail.includes('@')) {
          throw new Error('Invalid email address from authentication: ' + authEmail);
        }
        
        const charityProfile = {
          email: normalizedEmail, // Always store normalized to ensure consistency
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
          address: additionalData.address || (locationDataForDb?.address || ''),
          total_raised: 0,
          followers: 0,
          impact: {}
          // posts field removed - not a column in charities table
        };
        
        console.log('📝 Creating charity profile with email:', normalizedEmail);
        
        // Try to insert with location coordinates if available and columns exist
        let charity = null;
        let charityError = null;
        
        if (locationDataForDb && typeof locationDataForDb.latitude === 'number' && typeof locationDataForDb.longitude === 'number') {
          // Try inserting with location columns first
          const charityProfileWithLocation = {
            ...charityProfile,
            location_lat: locationDataForDb.latitude,
            location_lon: locationDataForDb.longitude
          };
          
          const result = await supabase
            .from('charities')
            .insert([charityProfileWithLocation])
            .select()
            .single();
          
          charity = result.data;
          charityError = result.error;
          
          // If error is due to missing columns, retry without them
          // Check for PGRST204 or error message mentioning missing column
          if (charityError && (
            charityError.code === 'PGRST204' || 
            (charityError.message && (
              charityError.message.includes('location_lat') ||
              charityError.message.includes('location_lon') ||
              charityError.message.includes('column') ||
              charityError.message.includes('schema cache')
            ))
          )) {
            console.log('⚠️ location_lat/location_lon columns not found in database, creating charity without location coordinates');
            console.log('⚠️ Error details:', charityError.message);
            const retryResult = await supabase
              .from('charities')
              .insert([charityProfile])
              .select()
              .single();
            
            charity = retryResult.data;
            charityError = retryResult.error;
            
            if (!charityError) {
              console.log('✅ Charity created successfully (location columns will be available after running migration)');
            }
          }
        } else {
          // No location data, insert without location columns
          const result = await supabase
            .from('charities')
            .insert([charityProfile])
            .select()
            .single();
          
          charity = result.data;
          charityError = result.error;
        }

        if (charityError) {
          console.error('❌ Charity profile creation error:', charityError);
          console.error('❌ Charity profile data attempted:', {
            email: normalizedEmail,
            name: charityProfile.name,
            category: charityProfile.category
          });
          throw new Error('Failed to create charity profile: ' + charityError.message);
        }

        if (!charity || !charity.id) {
          console.error('❌ Charity profile creation returned no data!');
          throw new Error('Charity profile creation failed - no data returned from database');
        }

        console.log('✅ Charity profile created in database');
        console.log('📧 Charity profile ID:', charity.id);
        console.log('📧 Charity profile email:', charity.email);
        console.log('📧 Charity profile name:', charity.name);
        console.log('📧 Auth user email:', authData.user.email);
        
        // Verify the charity profile was created and can be found
        // Add a small delay to ensure database consistency
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Try multiple verification attempts
        let verifyCharity = null;
        let verifyError = null;
        
        for (let verifyAttempt = 1; verifyAttempt <= 3; verifyAttempt++) {
          console.log(`🔍 Verification attempt ${verifyAttempt}/3...`);
          const verifyResult = await supabase
            .from('charities')
            .select('id, email, name')
            .eq('id', charity.id) // Query by ID first (most reliable)
            .maybeSingle();
          
          if (verifyResult.data && !verifyResult.error) {
            verifyCharity = verifyResult.data;
            console.log(`✅ Verified charity profile by ID on attempt ${verifyAttempt}`);
            break;
          }
          
          // If ID lookup fails, try email lookup
          const emailVerifyResult = await supabase
            .from('charities')
            .select('id, email, name')
            .eq('email', normalizedEmail)
            .maybeSingle();
          
          if (emailVerifyResult.data && !emailVerifyResult.error) {
            verifyCharity = emailVerifyResult.data;
            console.log(`✅ Verified charity profile by email on attempt ${verifyAttempt}`);
            break;
          }
          
          verifyError = emailVerifyResult.error || verifyResult.error;
          
          if (verifyAttempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 200 * verifyAttempt));
          }
        }
        
        if (!verifyCharity) {
          console.error('❌ Charity profile not found after creation!');
          console.error('❌ Charity ID created:', charity.id);
          console.error('❌ Email searched:', normalizedEmail);
          console.error('❌ Auth user email:', authData.user.email);
          console.error('❌ Verification error:', verifyError);
          
          // Last resort: query by ID directly
          const { data: directQuery } = await supabase
            .from('charities')
            .select('*')
            .eq('id', charity.id)
            .single();
          
          if (directQuery) {
            console.log('✅ Found charity with direct ID query:', directQuery.email);
            verifyCharity = directQuery;
          } else {
            throw new Error('Charity profile was created but cannot be verified. Please try signing in - your account may still work.');
          }
        } else {
          console.log('✅ Verified charity profile exists:', {
            id: verifyCharity.id,
            name: verifyCharity.name,
            email: verifyCharity.email
          });
        }
        
        // NOTE: We do NOT create a user entry here during sign-up
        // User entries are only created when needed (e.g., when charity tries to like/comment)
        // This avoids duplicate entries and keeps charity and user accounts separate

        // If location data was provided, try to save it to database
        if (locationDataForDb && typeof locationDataForDb.latitude === 'number' && typeof locationDataForDb.longitude === 'number') {
          console.log(`📍 Attempting to save location for ${charity.name}: ${locationDataForDb.latitude}, ${locationDataForDb.longitude}`);
          
          // Try to update the charity with location data if columns exist
          const { error: updateError } = await supabase
            .from('charities')
            .update({
              location_lat: locationDataForDb.latitude,
              location_lon: locationDataForDb.longitude
            })
            .eq('id', charity.id);
          
          if (updateError) {
            if (updateError.code === 'PGRST204' || updateError.message?.includes('location_lat') || updateError.message?.includes('column') || updateError.message?.includes('schema cache')) {
              console.log('⚠️ Location columns not found in database. Please run the migration to add location_lat and location_lon columns.');
              console.log('⚠️ Storing location temporarily in local state (will be lost on app restart until migration is run).');
              
              // Store location in local state as fallback - merge with loaded charities
              let city = charity.country;
              if (charity.address) {
                const parts = charity.address.split(',');
                if (parts.length > 0) {
                  city = parts[0].trim();
                }
              }
              
              const charityWithLocation = {
                id: charity.id,
                name: charity.name,
                category: charity.category,
                country: charity.country,
                email: charity.email,
                location: {
                  city: locationDataForDb.city || city || charity.country,
                  country: locationDataForDb.country || charity.country,
                  latitude: locationDataForDb.latitude,
                  longitude: locationDataForDb.longitude
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
                posts: []
              };
              
              // Update local state with location (this will be used until migration is run)
              setCharitiesData(prev => {
                console.log(`🔄 Updating charities list. Current count: ${prev.length}`);
                const existing = prev.find(c => c.id === charity.id);
                if (existing) {
                  // Update existing charity with location
                  const updated = prev.map(c => c.id === charity.id ? charityWithLocation : c);
                  console.log(`✅ Updated charity "${charity.name}" with location in local state`);
                  console.log(`📍 Updated location: ${charityWithLocation.location.latitude}, ${charityWithLocation.location.longitude}`);
                  console.log(`📊 Total charities after update: ${updated.length}`);
                  return updated;
                } else {
                  // Add new charity with location
                  const newList = [...prev, charityWithLocation];
                  console.log(`✅ Added new charity "${charity.name}" with location to local state`);
                  console.log(`📍 Location: ${charityWithLocation.location.latitude}, ${charityWithLocation.location.longitude}`);
                  console.log(`📊 Total charities after add: ${newList.length}`);
                  console.log(`🗺️ Charity should now appear on map if within search radius`);
                  return newList;
                }
              });
              
              console.log('✅ Added charity with location to local state (temporary until migration is run)');
              console.log('📍 Location:', charityWithLocation.location.latitude, charityWithLocation.location.longitude);
              console.log('⚠️ IMPORTANT: Run the migration script to add location_lat and location_lon columns to the database');
              console.log('⚠️ Until then, location is stored in local state only');
              
              // Don't reload from database here - it would overwrite the location we just added
              // The charity with location is already in local state above
              // We'll reload after signup completes to get any other updates
            } else {
              console.log('⚠️ Could not update charity location:', updateError.message);
            }
          } else {
            console.log('✅ Successfully saved location to database');
            // Reload charities from database to ensure we have the latest data with location
            await loadCharitiesFromDatabase();
            
            // Verify the charity is in the list with location
            setCharitiesData(prev => {
              const charityInList = prev.find(c => c.id === charity.id);
              if (charityInList) {
                console.log(`✅ Charity "${charity.name}" verified in charities list`);
                if (charityInList.location?.latitude && charityInList.location?.longitude) {
                  console.log(`✅ Charity has location: ${charityInList.location.latitude}, ${charityInList.location.longitude}`);
                  console.log(`🗺️ Charity should appear on map if within search radius`);
                } else {
                  console.log(`⚠️ Charity is in list but has no location data`);
                }
              } else {
                console.error(`❌ Charity "${charity.name}" NOT found in charities list after reload!`);
              }
              return prev;
            });
          }
        } else {
          // No location data provided, but still reload charities to get latest data
          await loadCharitiesFromDatabase();
          
          // Verify the charity is in the list (even without location)
          setCharitiesData(prev => {
            const charityInList = prev.find(c => c.id === charity.id);
            if (charityInList) {
              console.log(`✅ Charity "${charity.name}" verified in charities list (no location provided)`);
            } else {
              console.error(`❌ Charity "${charity.name}" NOT found in charities list after reload!`);
            }
            return prev;
          });
        }
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

      // Load the user profile (session should always exist if email confirmation is disabled)
      // For charity accounts, we need to retry a few times in case of database replication delay
      try {
        if (userType === 'charity') {
          // For charity accounts, retry loading the profile a few times
          // This handles potential database replication delays
          let profileLoaded = false;
          let lastError = null;
          
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              console.log(`🔄 Attempting to load charity profile (attempt ${attempt}/3)...`);
              await loadUserProfile(authData.user, userType);
              profileLoaded = true;
              console.log(`✅ Charity profile loaded successfully on attempt ${attempt}`);
              break;
            } catch (retryError) {
              console.error(`❌ Attempt ${attempt} failed:`, retryError.message);
              lastError = retryError;
              
              if (attempt < 3) {
                // Wait a bit before retrying (exponential backoff)
                const delay = attempt * 200; // 200ms, 400ms
                console.log(`⏳ Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }
          
          if (!profileLoaded) {
            // Final attempt: try to manually verify the charity exists
            const authEmail = authData.user.email;
            const normalizedEmail = authEmail?.toLowerCase().trim();
            
            console.log('🔍 Final verification: checking if charity profile exists...');
            const { data: finalCheck } = await supabase
              .from('charities')
              .select('id, email, name')
              .eq('email', normalizedEmail)
              .maybeSingle();
            
            if (finalCheck) {
              console.log('✅ Charity profile exists in database, but loadUserProfile failed');
              console.log('📧 Charity email:', finalCheck.email);
              console.log('📧 Auth email:', authEmail);
              throw new Error('Charity account was created successfully, but there was an issue loading your profile. Please try signing in - your account should work now.');
            } else {
              console.error('❌ Charity profile not found in database after all attempts');
              throw new Error('Charity account was created, but the profile could not be found. Please try signing in, or contact support if the problem persists.');
            }
          }
        } else {
          // For regular users, just load normally
          await loadUserProfile(authData.user, userType);
        }
        
        setIsConnected(true);
        console.log('✅ Account created successfully and user is signed in!');
        
        return { user: authData.user };
      } catch (profileError) {
        console.error('❌ Error loading user profile after signup:', profileError);
        throw profileError;
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const signIn = async ({ email, password, expectedUserType = null }) => {
    try {
      console.log('🔄 Signing in with Supabase...');
      if (expectedUserType) {
        console.log(`📋 Expected account type: ${expectedUserType}`);
      }
      
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

      // Load user profile from database with expected user type check
      await loadUserProfile(authData.user, expectedUserType);
      setIsConnected(true);
      
      console.log('✅ Sign in successful!');
      return { user: authData.user };
    } catch (error) {
      console.error('Signin error:', error);
      // If error message already contains helpful info (like "charity account"), use it
      // Otherwise use generic message
      if (error.message.includes('charity account') || error.message.includes('regular user')) {
        throw error;
      }
      throw new Error('Invalid email or password');
    }
  };

  const signOut = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear AsyncStorage
      
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

      console.log('🔄 Creating donation in database...', {
        userId: user.id,
      charityId,
      amount,
        message: message ? message.substring(0, 50) : null
      });

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
        console.error('❌ Donation creation error:', donationError);
        console.error('Donation data attempted:', donationData);
        throw new Error('Failed to create donation: ' + donationError.message);
      }

      if (!newDonation || !newDonation.id) {
        console.error('❌ Donation created but no ID returned:', newDonation);
        throw new Error('Donation was created but no ID was returned from database');
      }

      console.log('✅ Donation created in database with ID:', newDonation.id);

      // Update user's total_donated in database
      // Use raw SQL to ensure atomic update (get current value and add)
      const { data: currentUserData, error: fetchUserError } = await supabase
        .from('users')
        .select('total_donated, total_donations')
        .eq('id', user.id)
        .single();

      if (!fetchUserError && currentUserData) {
        const currentTotalDonated = parseFloat(currentUserData.total_donated || 0);
        const currentTotalDonations = parseInt(currentUserData.total_donations || 0);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            total_donated: currentTotalDonated + amount,
            total_donations: currentTotalDonations + 1
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating user total_donated:', updateError);
          // Continue anyway - donation was created successfully
        } else {
          console.log('✅ User total_donated updated in database');
        }
      } else {
        console.warn('⚠️ Could not fetch current user data for update:', fetchUserError?.message);
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
      
      // Add to local posts state (prepend to show at top) - this is the SINGLE SOURCE OF TRUTH
      setPosts(prev => [formattedPost, ...prev]);

      // Update user's posts array to only store post IDs (not full objects)
      // This way we always reference the same post objects from the global posts array
      setUser(prevUser => {
        if (!prevUser) return prevUser;
        const currentPostIds = Array.isArray(prevUser.posts) 
          ? prevUser.posts.map(p => typeof p === 'object' ? p.id : p).filter(Boolean)
          : [];
        return {
          ...prevUser,
          posts: [formattedPost.id, ...currentPostIds] // Store only IDs, not full objects
        };
      });

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

    // For charities, we need to ensure they have a user entry for likes/comments
    // Create it on-demand if it doesn't exist (lazy creation)
    let actualUserId = userId;
    
    if (user.userType === 'charity') {
      // First, check if user entry already exists to avoid duplicates
      try {
        const { data: existingUserEntry } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .eq('user_type', 'charity')
          .maybeSingle();
        
        if (existingUserEntry) {
          // User entry already exists - use it
          actualUserId = existingUserEntry.id;
          // Update user state with the dbId if not already set
          if (!user.dbId || user.dbId !== existingUserEntry.id) {
            setUser(prev => prev ? { ...prev, dbId: existingUserEntry.id, id: existingUserEntry.id } : prev);
            console.log('✅ Found existing user entry for charity');
          }
        } else if (!user.dbId) {
          // No user entry exists and dbId is not set - create one on-demand
          console.log('ℹ️ Charity account needs user entry for likes/comments, creating one...');
          
          // Get charity profile to get name, logo, etc.
          const { data: charityProfile } = await supabase
            .from('charities')
            .select('name, country, logo_url, email')
            .eq('email', user.email)
            .maybeSingle();
          
          if (charityProfile) {
            // Create user entry for charity
            const { data: newUserEntry, error: createError } = await supabase
              .from('users')
              .insert([{
                email: user.email,
                name: charityProfile.name,
                country: charityProfile.country,
                user_type: 'charity',
                avatar_url: charityProfile.logo_url,
                total_donated: 0,
                total_donations: 0,
                followed_charities: []
              }])
              .select('id')
              .single();
            
            if (createError) {
              // If duplicate key error (shouldn't happen since we checked, but handle it)
              if (createError.code === '23505') {
                console.log('⚠️ User entry was created by another process, fetching...');
                const { data: existingUser } = await supabase
                  .from('users')
                  .select('id')
                  .eq('email', user.email)
                  .eq('user_type', 'charity')
                  .maybeSingle();
                
                if (existingUser) {
                  actualUserId = existingUser.id;
                  setUser(prev => prev ? { ...prev, dbId: existingUser.id, id: existingUser.id } : prev);
                  console.log('✅ Found existing user entry for charity');
                } else {
                  console.error('❌ Could not create or find user entry for charity:', createError);
                  return;
                }
              } else {
                console.error('❌ Failed to create user entry for charity:', createError);
                return;
              }
            } else if (newUserEntry) {
              actualUserId = newUserEntry.id;
              // Update user state with the new dbId
              setUser(prev => prev ? { ...prev, dbId: newUserEntry.id, id: newUserEntry.id } : prev);
              console.log('✅ Created user entry for charity (enables likes/comments)');
            }
          } else {
            console.error('❌ Could not find charity profile');
            return;
          }
        } else {
          // User has dbId, use it
          actualUserId = user.dbId;
        }
      } catch (createErr) {
        console.error('❌ Error checking/creating user entry for charity:', createErr);
        return;
      }
    } else {
      // For regular users or charities that already have user entries, verify the user ID exists
      try {
        const { data: userCheck, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .maybeSingle(); // Use maybeSingle() to avoid error when not found

        if (checkError && checkError.code !== 'PGRST116') {
          // Real error (not "not found")
          console.error('❌ Error checking user ID:', checkError);
          return;
        }
        
        if (!userCheck) {
          console.error('❌ User ID not found in users table:', userId);
          console.log('⚠️ User object:', { id: user.id, dbId: user.dbId, email: user.email, userType: user.userType });
          return;
        }
      } catch (verifyError) {
        console.error('❌ Error verifying user ID:', verifyError);
        return;
      }
    }

    // Check if user already liked this post
    const isLiked = likedPosts.includes(postId);
    
    try {
      if (isLiked) {
        // Unlike: Remove from database
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', actualUserId)
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
            user_id: actualUserId,
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

    // For charities, ensure they have a user entry for comments (lazy creation)
    let actualUserId = user.id;
    
    if (user.userType === 'charity') {
      // First, check if user entry already exists to avoid duplicates
      try {
        const { data: existingUserEntry } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .eq('user_type', 'charity')
          .maybeSingle();
        
        if (existingUserEntry) {
          // User entry already exists - use it
          actualUserId = existingUserEntry.id;
          // Update user state with the dbId if not already set
          if (!user.dbId || user.dbId !== existingUserEntry.id) {
            setUser(prev => prev ? { ...prev, dbId: existingUserEntry.id, id: existingUserEntry.id } : prev);
            console.log('✅ Found existing user entry for charity');
          }
        } else if (!user.dbId) {
          // No user entry exists and dbId is not set - create one on-demand
          console.log('ℹ️ Charity account needs user entry for comments, creating one...');
          
          // Get charity profile to get name, logo, etc.
          const { data: charityProfile } = await supabase
            .from('charities')
            .select('name, country, logo_url, email')
            .eq('email', user.email)
            .maybeSingle();
          
          if (charityProfile) {
            // Create user entry for charity
            const { data: newUserEntry, error: createError } = await supabase
              .from('users')
              .insert([{
                email: user.email,
                name: charityProfile.name,
                country: charityProfile.country,
                user_type: 'charity',
                avatar_url: charityProfile.logo_url,
                total_donated: 0,
                total_donations: 0,
                followed_charities: []
              }])
              .select('id')
              .single();
            
            if (createError) {
              // If duplicate key error (shouldn't happen since we checked, but handle it)
              if (createError.code === '23505') {
                console.log('⚠️ User entry was created by another process, fetching...');
                const { data: existingUser } = await supabase
                  .from('users')
                  .select('id')
                  .eq('email', user.email)
                  .eq('user_type', 'charity')
                  .maybeSingle();
                
                if (existingUser) {
                  actualUserId = existingUser.id;
                  setUser(prev => prev ? { ...prev, dbId: existingUser.id, id: existingUser.id } : prev);
                  console.log('✅ Found existing user entry for charity');
                } else {
                  throw new Error('Could not create or find user entry for charity');
                }
              } else {
                throw new Error('Failed to create user entry for charity: ' + createError.message);
              }
            } else if (newUserEntry) {
              actualUserId = newUserEntry.id;
              // Update user state with the new dbId
              setUser(prev => prev ? { ...prev, dbId: newUserEntry.id, id: newUserEntry.id } : prev);
              console.log('✅ Created user entry for charity (enables comments)');
            }
          } else {
            throw new Error('Could not find charity profile');
          }
        } else {
          // User has dbId, use it
          actualUserId = user.dbId;
        }
      } catch (createErr) {
        console.error('❌ Error checking/creating user entry for charity:', createErr);
        throw new Error('Failed to set up charity account for commenting: ' + createErr.message);
      }
    }

    try {
      // Add comment to database
      const { data: newComment, error } = await supabase
        .from('comments')
        .insert([{
          user_id: actualUserId,
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

  const loadCharityDonations = async (charityId) => {
    try {
      console.log('🔄 Loading donations for charity:', charityId);
      
      // Load donations where charity_id matches
      const { data: donationsData, error } = await supabase
        .from('donations')
        .select(`
          *,
          users (
            id,
            name,
            avatar_url,
            email
          )
        `)
        .eq('charity_id', charityId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading charity donations:', error);
        throw error;
      }

      if (donationsData && donationsData.length > 0) {
        // Format donations with donor info
        const formattedDonations = donationsData.map(donation => ({
          id: donation.id,
          amount: donation.amount,
          message: donation.message,
          date: donation.created_at ? donation.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          createdAt: donation.created_at,
          donor: donation.users ? {
            id: donation.users.id,
            name: donation.users.name || 'Anonymous',
            avatar: donation.users.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
            email: donation.users.email
          } : {
            id: donation.user_id,
            name: 'Unknown Donor',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
          }
        }));

        console.log(`✅ Loaded ${formattedDonations.length} donations for charity`);
        return formattedDonations;
      }

      return [];
    } catch (error) {
      console.error('Error loading charity donations:', error);
      return [];
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

  const updateProfile = async (updateData) => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }

      const isCharity = user.userType === 'charity';

      if (isCharity) {
        // Update charity profile
        const updatePayload = {};

        if (updateData.charityName) updatePayload.name = updateData.charityName;
        if (updateData.mission) updatePayload.mission = updateData.mission;
        if (updateData.website !== undefined) updatePayload.website = updateData.website;
        if (updateData.phone !== undefined) updatePayload.phone = updateData.phone;
        if (updateData.address !== undefined) updatePayload.address = updateData.address;
        if (updateData.country) updatePayload.country = updateData.country;
        if (updateData.category) updatePayload.category = updateData.category;
        if (updateData.foundedYear) updatePayload.founded_year = updateData.foundedYear;

        // Handle avatar/logo
        if (updateData.avatarUrl && updateData.avatarUrl !== user.logo) {
          updatePayload.logo_url = updateData.avatarUrl;
        }

        // Handle location data
        if (updateData.location && typeof updateData.location.latitude === 'number' && typeof updateData.location.longitude === 'number') {
          updatePayload.location_lat = updateData.location.latitude;
          updatePayload.location_lon = updateData.location.longitude;
        }

        // Update charity in database
        const { error: charityError } = await supabase
          .from('charities')
          .update(updatePayload)
          .eq('email', user.email);

        if (charityError) {
          // If location columns don't exist, retry without them
          if (charityError.code === 'PGRST204' || charityError.message?.includes('location_lat') || charityError.message?.includes('column')) {
            const updateWithoutLocation = { ...updatePayload };
            delete updateWithoutLocation.location_lat;
            delete updateWithoutLocation.location_lon;
            
            const { error: retryError } = await supabase
              .from('charities')
              .update(updateWithoutLocation)
              .eq('email', user.email);
            
            if (retryError) {
              throw new Error('Failed to update charity profile: ' + retryError.message);
            }
            console.log('⚠️ Location columns not found, updated charity without location');
          } else {
            throw new Error('Failed to update charity profile: ' + charityError.message);
          }
        }

        console.log('✅ Charity profile updated in database');

        // Also update corresponding user entry (if exists) for charity accounts
        // This ensures comments and likes reflect the updated name/logo
        if (user.dbId || user.id) {
          const userUpdatePayload = {};
          if (updateData.charityName) userUpdatePayload.name = updateData.charityName;
          if (updateData.avatarUrl && updateData.avatarUrl !== user.logo) {
            userUpdatePayload.avatar_url = updateData.avatarUrl;
          }
          if (updateData.country) userUpdatePayload.country = updateData.country;

          if (Object.keys(userUpdatePayload).length > 0) {
            const userIdToUpdate = user.dbId || user.id;
            const { error: userUpdateError } = await supabase
              .from('users')
              .update(userUpdatePayload)
              .eq('id', userIdToUpdate)
              .eq('user_type', 'charity');

            if (!userUpdateError) {
              console.log('✅ Updated charity user entry for comments/likes');
            }
          }
        }

        // Reload charity data
        await loadCharitiesFromDatabase();
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        if (supabaseUser) {
          await loadUserProfile(supabaseUser);
        }
      } else {
        // Update user profile
        const updatePayload = {};

        if (updateData.name) updatePayload.name = updateData.name;
        if (updateData.country) updatePayload.country = updateData.country;
        if (updateData.bio !== undefined) updatePayload.bio = updateData.bio;

        // Handle avatar
        if (updateData.avatarUrl && updateData.avatarUrl !== user.avatar) {
          updatePayload.avatar_url = updateData.avatarUrl;
        }

        // Update user in database
        const { error: userError } = await supabase
          .from('users')
          .update(updatePayload)
          .eq('id', user.id);

        if (userError) {
          throw new Error('Failed to update user profile: ' + userError.message);
        }

        console.log('✅ User profile updated in database');
      }

      // Calculate what values will be updated (for immediate local state updates)
      const updatedName = isCharity 
        ? (updateData.charityName !== undefined ? updateData.charityName : user.name)
        : (updateData.name !== undefined ? updateData.name : user.name);
      const updatedAvatar = updateData.avatarUrl || (isCharity ? user.logo : user.avatar);
      const userIdToMatch = isCharity ? (user.dbId || user.id) : user.id;
      const charityIdToMatch = isCharity ? user.charityId : null;

      // Update local state for comments and posts BEFORE reloading
      // This ensures UI updates instantly without waiting for database reloads
      const hasNameChange = isCharity 
        ? (updateData.charityName !== undefined && updateData.charityName !== user.name)
        : (updateData.name !== undefined && updateData.name !== user.name);
      const hasAvatarChange = updateData.avatarUrl && updateData.avatarUrl !== (isCharity ? user.logo : user.avatar);

      if (hasNameChange || hasAvatarChange) {
        // Update all comments by this user in local state
        setComments(prev => {
          const updated = { ...prev };
          
          Object.keys(updated).forEach(postId => {
            updated[postId] = updated[postId].map(comment => {
              if (comment.userId === userIdToMatch) {
                return {
                  ...comment,
                  userName: hasNameChange ? updatedName : comment.userName,
                  userAvatar: hasAvatarChange ? updatedAvatar : comment.userAvatar
                };
              }
              return comment;
            });
          });
          
          return updated;
        });
        console.log('✅ Updated all comments in local state');

        // Update all posts by this user/charity in local state
        setPosts(prev => prev.map(post => {
          // For user posts
          if (post.userId === userIdToMatch) {
            return {
              ...post,
              userName: hasNameChange ? updatedName : post.userName,
              userAvatar: hasAvatarChange ? updatedAvatar : post.userAvatar
            };
          }
          return post;
        }));
        console.log('✅ Updated all posts in local state');

        // Note: user.posts may contain either IDs or full objects depending on how they were loaded
        // The global posts array is already updated above, which is the single source of truth
        // When posts are displayed, they should always filter from the global posts array
        console.log('✅ Posts updated in global posts array (single source of truth)');
      }

      // Prepare updated user info to pass to loadPostsFromDatabase
      // This ensures posts get the updated name/avatar immediately
      const updatedUserInfoForPosts = {
        ...user,
        name: isCharity ? (updateData.charityName !== undefined ? updateData.charityName : user.name) : (updateData.name !== undefined ? updateData.name : user.name),
        avatar: updateData.avatarUrl || (isCharity ? user.logo : user.avatar),
        logo: isCharity ? (updateData.avatarUrl || user.logo) : user.logo,
        id: userIdToMatch
      };

      // Reload user profile to get updated data from database
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (supabaseUser) {
        await loadUserProfile(supabaseUser);
      }

      // Reload posts from database, passing updated user info
      // This ensures posts use the latest name/avatar instead of querying stale data
      await loadPostsFromDatabase(updatedUserInfoForPosts);

      console.log('✅ Reloaded posts from database with updated user info');
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
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
    loadCharityDonations,
    findUserIdForPost,
    testSupabaseConnection,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
