// Demo data for CharitEase mobile app

export const charities = [
  {
    id: '1',
    name: 'Syrian Education Foundation',
    category: 'Education',
    country: 'Syria',
    location: {
      city: 'Damascus',
      country: 'Syria',
      latitude: 33.5138,
      longitude: 36.2765
    },
    founded: 2015,
    verified: true,
    logo: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&h=200&fit=crop&crop=face',
    coverImage: 'https://images.unsplash.com/photo-1523240798131-586a4680c3a0?w=400&h=200&fit=crop',
    mission: 'Providing quality education opportunities for Syrian children affected by conflict, ensuring they have access to learning materials, safe spaces, and qualified teachers.',
    totalRaised: 245000,
    followers: 12400,
    impact: {
      studentsSupported: 1250,
      schoolsBuilt: 8,
      teachersTrained: 45,
      booksDistributed: 15000
    }
  },
  {
    id: '2',
    name: 'Hope for Syria Medical',
    category: 'Healthcare',
    country: 'Syria',
    location: {
      city: 'Aleppo',
      country: 'Syria',
      latitude: 36.2021,
      longitude: 37.1343
    },
    founded: 2013,
    verified: true,
    logo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face',
    coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=200&fit=crop',
    mission: 'Delivering critical medical care and supplies to Syrian communities, operating mobile clinics and supporting local healthcare workers.',
    totalRaised: 189000,
    followers: 8900,
    impact: {
      patientsTreated: 3200,
      clinicsOperated: 12,
      medicalSuppliesDistributed: 8500,
      surgeriesPerformed: 450
    }
  },
  {
    id: '3',
    name: 'Syrian Community Development',
    category: 'Community Development',
    country: 'Syria',
    location: {
      city: 'Homs',
      country: 'Syria',
      latitude: 34.7324,
      longitude: 36.7135
    },
    founded: 2016,
    verified: false,
    logo: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=200&h=200&fit=crop&crop=face',
    coverImage: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&h=200&fit=crop',
    mission: 'Rebuilding Syrian communities through infrastructure development, job creation, and social programs that restore hope and stability.',
    totalRaised: 156000,
    followers: 6800,
    impact: {
      jobsCreated: 320,
      homesRebuilt: 45,
      communityCenters: 6,
      familiesSupported: 890
    }
  },
  {
    id: '4',
    name: "Afghan Women's Education Initiative",
    category: 'Education',
    country: 'Afghanistan',
    location: {
      city: 'Kabul',
      country: 'Afghanistan',
      latitude: 34.5553,
      longitude: 69.2075
    },
    founded: 2018,
    verified: true,
    logo: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=200&fit=crop&crop=face',
    coverImage: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=200&fit=crop',
    mission: 'Empowering Afghan women and girls through education, vocational training, and leadership development programs.',
    totalRaised: 98000,
    followers: 5600,
    impact: {
      womenEducated: 1200,
      vocationalPrograms: 15,
      scholarshipsAwarded: 85,
      literacyClasses: 42
    }
  },
  {
    id: '5',
    name: 'Lebanese Relief Network',
    category: 'Disaster Relief',
    country: 'Lebanon',
    location: {
      city: 'Beirut',
      country: 'Lebanon',
      latitude: 33.8938,
      longitude: 35.5018
    },
    founded: 2020,
    verified: true,
    logo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
    coverImage: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=200&fit=crop',
    mission: 'Providing emergency relief and long-term recovery support to Lebanese communities affected by crisis and natural disasters.',
    totalRaised: 320000,
    followers: 15200,
    impact: {
      familiesAided: 2100,
      emergencySupplies: 15000,
      shelterProvided: 320,
      mealsServed: 45000
    }
  },
  {
    id: '6',
    name: 'Iraqi Youth Development',
    category: 'Youth Development',
    country: 'Iraq',
    location: {
      city: 'Baghdad',
      country: 'Iraq',
      latitude: 33.3152,
      longitude: 44.3661
    },
    founded: 2017,
    verified: false,
    logo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    coverImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=200&fit=crop',
    mission: 'Nurturing the next generation of Iraqi leaders through mentorship, skills training, and community engagement programs.',
    totalRaised: 78000,
    followers: 4200,
    impact: {
      youthMentored: 850,
      skillsWorkshops: 28,
      leadershipPrograms: 12,
      communityProjects: 35
    }
  }
];

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

export const donationHistory = [
  {
    id: 'donation1',
    charityId: '1',
    amount: 150,
    date: '2024-01-15',
    message: 'Supporting education for Syrian children'
  },
  {
    id: 'donation2',
    charityId: '2',
    amount: 100,
    date: '2023-12-20',
    message: 'Medical supplies for families in need'
  },
  {
    id: 'donation3',
    charityId: '4',
    amount: 200,
    date: '2023-11-10',
    message: 'Empowering Afghan women through education'
  },
  {
    id: 'donation4',
    charityId: '1',
    amount: 75,
    date: '2023-10-05',
    message: 'School supplies for children'
  },
  {
    id: 'donation5',
    charityId: '2',
    amount: 50,
    date: '2023-09-18',
    message: 'Emergency medical aid'
  }
];

export const socialPosts = [
  {
    id: 'post1',
    charityId: '1',
    type: 'milestone',
    title: '🎉 Major Milestone Reached!',
    content: "We're thrilled to announce that we've successfully built our 8th school in northern Syria! This new facility will provide education for 200 children who previously had no access to schooling. Thank you to all our supporters who made this possible!",
    image: 'https://images.unsplash.com/photo-1523240798131-586a4680c3a0?w=400&h=300&fit=crop',
    timestamp: '2024-01-20T10:30:00Z',
    likes: 342,
    comments: 28,
    shares: 15
  },
  {
    id: 'post2',
    charityId: '2',
    type: 'update',
    title: 'Medical Mission Update',
    content: 'Our mobile clinic team visited 3 remote villages this week, treating 156 patients including 45 children. We distributed essential medicines and provided critical care to families who have been without medical access for months.',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop',
    timestamp: '2024-01-18T14:15:00Z',
    likes: 189,
    comments: 12,
    shares: 8
  },
  {
    id: 'post3',
    charityId: '4',
    type: 'story',
    title: "Fatima's Story",
    content: "Meet Fatima, a 22-year-old Afghan woman who graduated from our vocational training program. She now runs her own tailoring business and employs 3 other women. \"Education gave me hope when I had none,\" she says. Stories like Fatima's inspire us every day.",
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop',
    timestamp: '2024-01-16T09:45:00Z',
    likes: 456,
    comments: 34,
    shares: 22
  },
  {
    id: 'post4',
    charityId: '5',
    type: 'milestone',
    title: 'Emergency Response Success',
    content: 'In response to the recent crisis, our team successfully distributed emergency supplies to 500 families across Beirut. Food packages, hygiene kits, and essential medicines reached those who needed them most. Thank you for your continued support!',
    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop',
    timestamp: '2024-01-14T16:20:00Z',
    likes: 278,
    comments: 19,
    shares: 12
  },
  {
    id: 'post5',
    charityId: '3',
    type: 'update',
    title: 'Community Center Opening',
    content: "We're excited to announce the opening of our 6th community center in Damascus! This new facility will provide job training, childcare services, and community events for over 300 families. The center includes a computer lab, library, and meeting rooms.",
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&h=300&fit=crop',
    timestamp: '2024-01-12T11:10:00Z',
    likes: 167,
    comments: 15,
    shares: 9
  },
  {
    id: 'post6',
    charityId: '6',
    type: 'story',
    title: "Ahmed's Leadership Journey",
    content: 'Ahmed, a 19-year-old from Baghdad, joined our youth leadership program last year. Today, he is organizing community clean-up initiatives and mentoring younger participants. "This program showed me that I can make a difference in my community," he shares proudly.',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop',
    timestamp: '2024-01-10T13:30:00Z',
    likes: 234,
    comments: 21,
    shares: 14
  },
  {
    id: 'post7',
    charityId: '2',
    type: 'milestone',
    title: '1000 Surgeries Completed',
    content: 'Today we celebrate a major milestone - our medical teams have successfully completed 1000 life-saving surgeries! Each procedure represents a life changed, a family given hope. We are grateful to our medical volunteers and supporters who make this work possible.',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop',
    timestamp: '2024-01-08T08:00:00Z',
    likes: 523,
    comments: 42,
    shares: 31
  },
  {
    id: 'post8',
    charityId: '5',
    type: 'update',
    title: 'Neighborhood Kitchen Expansion',
    content: 'We opened two additional community kitchens in Tripoli this week, serving warm meals to over 600 families displaced by recent storms. Volunteers continue to prep fresh food every day thanks to your support.',
    image: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=400&h=300&fit=crop',
    timestamp: '2024-01-05T12:15:00Z',
    likes: 198,
    comments: 17,
    shares: 11
  },
  {
    id: 'post9',
    charityId: '3',
    type: 'story',
    title: 'Entrepreneurship Graduates',
    content: 'Twenty-five young entrepreneurs just graduated from our accelerator in Homs. They are launching businesses ranging from eco-cleaning products to solar-powered phone charging kiosks. Their work is already creating jobs locally.',
    image: 'https://images.unsplash.com/photo-1483478550801-ceba5fe50e8e?w=400&h=300&fit=crop',
    timestamp: '2024-01-03T09:05:00Z',
    likes: 146,
    comments: 9,
    shares: 7
  }
];

export const categories = [
  'All',
  'Education',
  'Healthcare',
  'Community Development',
  'Disaster Relief',
  'Youth Development'
];

export const countries = [
  'All',
  'Syria',
  'Afghanistan',
  'Lebanon',
  'Iraq'
];