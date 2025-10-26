import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

// Screens
import FeedScreen from '../screens/FeedScreen';
import CharitiesScreen from '../screens/CharitiesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CharityDetailScreen from '../screens/CharityDetailScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import SignInScreen from '../screens/SignInScreen';
import CharityAdminScreen from '../screens/CharityAdminScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const AuthStack = createStackNavigator();

// Authentication Stack
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
      <AuthStack.Screen name="CharityAdmin" component={CharityAdminScreen} />
    </AuthStack.Navigator>
  );
};

// Charities Stack Navigator
const CharitiesStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="CharitiesList" 
        component={CharitiesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CharityDetail" 
        component={CharityDetailScreen}
        options={({ route }) => ({
          title: route.params?.charity?.name || 'Charity Details',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#1F2937',
          headerTitleStyle: {
            fontWeight: '600',
          },
        })}
      />
    </Stack.Navigator>
  );
};

// Main Tab Navigator
const MainTabs = () => {
  const { user } = useAuth();
  const isCharity = user?.userType === 'charity';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Feed') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Charities') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: isCharity ? '#22C55E' : '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          paddingBottom: 8,
          paddingTop: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Feed" 
        component={FeedScreen}
        options={{
          tabBarLabel: isCharity ? 'Posts' : 'Feed',
        }}
      />
      {!isCharity && (
        <Tab.Screen 
          name="Charities" 
          component={CharitiesStack}
          options={{
            tabBarLabel: 'Charities',
          }}
        />
      )}
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: isCharity ? 'Charity Profile' : 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingSpinner text="Loading CharitEase..." />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;
