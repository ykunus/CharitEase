import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { categories, countries } from '../data/demoData';
import CharityCard from '../components/CharityCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const CharitiesScreen = ({ navigation }) => {
  const { charitiesData, followedCharities, followCharity } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const filteredCharities = useMemo(() => {
    return charitiesData.filter(charity => {
      const matchesSearch = charity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           charity.mission.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || charity.category === selectedCategory;
      const matchesCountry = selectedCountry === 'All' || charity.country === selectedCountry;
      
      return matchesSearch && matchesCategory && matchesCountry;
    });
  }, [charitiesData, searchQuery, selectedCategory, selectedCountry]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  const handleCharityPress = (charity) => {
    navigation.navigate('CharityDetail', { charity });
  };

  const handleFollow = (charityId) => {
    followCharity(charityId);
  };

  const renderCharity = ({ item: charity }) => {
    const isFollowing = followedCharities.includes(charity.id);
    
    return (
      <CharityCard
        charity={charity}
        isFollowing={isFollowing}
        onFollow={handleFollow}
        onPress={handleCharityPress}
      />
    );
  };

  const renderFilterChip = ({ item: filter, type }) => {
    const isSelected = type === 'category' 
      ? selectedCategory === filter 
      : selectedCountry === filter;
    
    const onPress = () => {
      if (type === 'category') {
        setSelectedCategory(filter);
      } else {
        setSelectedCountry(filter);
      }
    };

    return (
      <TouchableOpacity
        style={[styles.filterChip, isSelected && styles.filterChipSelected]}
        onPress={onPress}
      >
        <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
          {filter}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <EmptyState
      icon="search-outline"
      title="No charities found"
      message="Try adjusting your search or filters to find charities you'd like to support."
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Discover Charities</Text>
      <Text style={styles.headerSubtitle}>
        Find and support causes you care about
      </Text>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search charities..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filters */}
      <View style={styles.filtersSection}>
        <Text style={styles.filtersTitle}>Categories</Text>
        <FlatList
          data={categories}
          renderItem={({ item }) => renderFilterChip({ item, type: 'category' })}
          keyExtractor={(item) => `category-${item}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        />
      </View>

      {/* Country Filters */}
      <View style={styles.filtersSection}>
        <Text style={styles.filtersTitle}>Countries</Text>
        <FlatList
          data={countries}
          renderItem={({ item }) => renderFilterChip({ item, type: 'country' })}
          keyExtractor={(item) => `country-${item}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        />
      </View>
    </View>
  );

  if (loading) {
    return <LoadingSpinner text="Loading charities..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredCharities}
        renderItem={renderCharity}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={filteredCharities.length === 0 ? styles.emptyContainer : styles.contentContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  filtersSection: {
    marginBottom: 16,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  filtersContainer: {
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
});

export default CharitiesScreen;
