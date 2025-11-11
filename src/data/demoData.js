// Demo data for CharitEase mobile app

// Empty array - all demo charities removed for testing
export const charities = [];

export const userProfile = {
  id: 'user1',
  name: 'Demo User',
  country: 'Syria',
  bio: 'Passionate about making a difference in the world through charitable giving.',
  location: {
    city: 'Damascus',
    country: 'Syria',
    latitude: 33.5138,
    longitude: 36.2765
  },
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  totalDonated: 0, // Reset for new users
  totalDonations: 0, // Reset for new users
  followedCharities: [], // Reset for new users
  joinedDate: '2023-01-15',
  userType: 'user'
};

// Empty array - all demo donation history removed for testing
export const donationHistory = [];

// Empty array - all demo posts removed for testing
export const socialPosts = [];

// Predefined charity categories for filtering and selection
export const charityCategories = [
  'Education',
  'Healthcare', 
  'Community Development',
  'Disaster Relief',
  'Youth Development',
  'Women Empowerment',
  'Environmental',
  'Animal Welfare',
  'Poverty Relief',
  'Human Rights',
  'Arts & Culture',
  'General'
];

// Categories for filtering (includes "All" option)
export const categories = ['All', ...charityCategories];

export const countries = [
  'All',
  'Syria',
  'Afghanistan',
  'Lebanon',
  'Iraq'
];