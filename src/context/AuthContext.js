import React, { createContext, useContext, useState, useEffect } from 'react';
import { userProfile, charities, socialPosts, donationHistory } from '../data/demoData';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(userProfile);
  const [charitiesData, setCharitiesData] = useState(charities);
  const [posts, setPosts] = useState(socialPosts);
  const [donations, setDonations] = useState(donationHistory);
  const [followedCharities, setFollowedCharities] = useState(userProfile.followedCharities);

  const followCharity = (charityId) => {
    if (followedCharities.includes(charityId)) {
      setFollowedCharities(prev => prev.filter(id => id !== charityId));
      setUser(prev => ({
        ...prev,
        followedCharities: prev.followedCharities.filter(id => id !== charityId)
      }));
    } else {
      setFollowedCharities(prev => [...prev, charityId]);
      setUser(prev => ({
        ...prev,
        followedCharities: [...prev.followedCharities, charityId]
      }));
    }
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
    charitiesData,
    posts,
    donations,
    followedCharities,
    followCharity,
    makeDonation,
    likePost,
    getCharityById,
    getFollowedCharitiesData,
    getFollowedCharitiesPosts
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
