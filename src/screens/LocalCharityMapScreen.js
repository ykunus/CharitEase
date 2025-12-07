import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { calculateDistanceKm, kmToMiles, milesToKm } from '../utils/geo';

const MIN_LAT_DELTA = 0.02;
const MIN_DISTANCE = 5; // miles
const MAX_DISTANCE = 300; // miles
const DISTANCE_STEP = 10; // miles
const DEFAULT_DISTANCE_MILES = 60;
const MILES_TO_METERS = 1609.34;

const formatDistance = (value) => {
  if (value == null) return '';
  return `${value.toFixed(value < 10 ? 1 : 0)} mi`;
};

const getDeltaForRadius = (radiusMiles, latitude) => {
  const radiusKm = milesToKm(radiusMiles) || milesToKm(DEFAULT_DISTANCE_MILES);
  const latDelta = Math.max(radiusKm / 111.32, MIN_LAT_DELTA);
  const safeLatitude = Math.min(Math.max(latitude, -89.9), 89.9);
  const lonDelta =
    Math.max(radiusKm / (111.32 * Math.cos((safeLatitude * Math.PI) / 180)), MIN_LAT_DELTA);
  return { latDelta, lonDelta };
};

const LocalCharityMapScreen = ({ route, navigation }) => {
  const { charitiesData, user } = useAuth();
  const [radius, setRadius] = useState(route.params?.radius || DEFAULT_DISTANCE_MILES);
  const initialLocation =
    route.params?.location ||
    user?.location ||
    charitiesData?.find((item) => item.location?.latitude && item.location?.longitude)?.location ||
    null;

  const [currentLocation, setCurrentLocation] = useState(initialLocation);
  const [permissionError, setPermissionError] = useState(null);
  const [region, setRegion] = useState(null);

  useEffect(() => {
    if (typeof route.params?.radius === 'number') {
      setRadius(route.params.radius);
    }
  }, [route.params?.radius]);

  useEffect(() => {
    navigation.setOptions({
      title: 'Nearby Charities',
      headerBackTitle: 'Back',
    });
  }, [navigation]);

  useEffect(() => {
    let isMounted = true;

    const requestAndFetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (!isMounted) return;

        if (status !== 'granted') {
          setPermissionError(
            'Location permission denied. Showing charities near your saved or selected location.'
          );
          return;
        }

        const { coords } = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!isMounted) return;

        const preciseLocation = {
          latitude: coords.latitude,
          longitude: coords.longitude,
        };

        setPermissionError(null);
        setCurrentLocation(preciseLocation);
      } catch (error) {
        if (!isMounted) return;

        setPermissionError(
          'Unable to determine current location. Showing charities near your saved or selected location.'
        );
      }
    };

    if (!route.params?.skipLocationRequest) {
      requestAndFetchLocation();
    } else if (!currentLocation) {
      setPermissionError('Location unavailable. Please enable location services and try again.');
    }

    return () => {
      isMounted = false;
    };
  }, [route.params?.skipLocationRequest]);

  useEffect(() => {
    if (!currentLocation) return;
    const { latDelta, lonDelta } = getDeltaForRadius(radius, currentLocation.latitude);
    setRegion({
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: latDelta,
      longitudeDelta: lonDelta,
    });
  }, [currentLocation, radius]);

  const nearbyCharities = useMemo(() => {
    if (!currentLocation?.latitude || !currentLocation?.longitude) return [];

    return charitiesData
      .map((charity) => {
        const latitude = charity.location?.latitude;
        const longitude = charity.location?.longitude;

        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          return null;
        }

        const distanceKm = calculateDistanceKm(currentLocation, { latitude, longitude });
        const distance = kmToMiles(distanceKm);
        if (distance == null || distance > radius) {
          return null;
        }

        return {
          ...charity,
          distance,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance);
  }, [charitiesData, currentLocation, radius]);

  const handleLocatePress = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionError('Location permission is required to recenter on your position.');
        return;
      }

      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const preciseLocation = {
        latitude: coords.latitude,
        longitude: coords.longitude,
      };

      setCurrentLocation(preciseLocation);
      setPermissionError(null);
    } catch (error) {
      setPermissionError('Unable to recenter on your current location.');
    }
  }, []);

  const handleDistanceChange = (delta) => {
    setRadius((prev) => {
      const next = prev + delta;
      if (next < MIN_DISTANCE) return MIN_DISTANCE;
      if (next > MAX_DISTANCE) return MAX_DISTANCE;
      return next;
    });
  };

  const handleCharityPress = (charity) => {
    // Navigate to the new charity profile view screen
    if (charity && charity.id) {
      navigation.navigate('CharityProfileView', { charityId: charity.id });
    }
  };

  if (!region) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Preparing map view...</Text>
        {permissionError ? <Text style={styles.errorText}>{permissionError}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={(nextRegion) => setRegion(nextRegion)}
      >
        {currentLocation ? (
          <>
            <Marker
              coordinate={currentLocation}
              title="You are here"
              pinColor="#2563EB"
            />
            <Circle
              center={currentLocation}
              radius={radius * MILES_TO_METERS}
              strokeColor="rgba(37, 99, 235, 0.5)"
              fillColor="rgba(37, 99, 235, 0.1)"
            />
          </>
        ) : null}

        {nearbyCharities.map((charity) => (
          <Marker
            key={charity.id}
            coordinate={{
              latitude: charity.location.latitude,
              longitude: charity.location.longitude,
            }}
            title={charity.name}
            description={`${charity.category} • ${formatDistance(charity.distance)} away`}
            onPress={() => handleCharityPress(charity)}
          />
        ))}
      </MapView>

      <View style={styles.mapOverlay}>
        <View style={styles.overlayHeader}>
          <View>
            <Text style={styles.overlayTitle}>Nearby Charities</Text>
            {permissionError ? (
              <Text style={styles.overlayWarning}>{permissionError}</Text>
            ) : null}
          </View>
          <TouchableOpacity style={styles.locateButton} onPress={handleLocatePress}>
            <Ionicons name="locate" size={20} color="#1F2937" />
          </TouchableOpacity>
        </View>

        <View style={styles.distanceBlock}>
          <Text style={styles.distanceLabel}>Showing within {radius} miles</Text>
          <View style={styles.distanceControls}>
            <TouchableOpacity
              style={styles.distanceButton}
              onPress={() => handleDistanceChange(-DISTANCE_STEP)}
            >
              <Ionicons name="remove-outline" size={18} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.distanceValue}>{radius} mi</Text>
            <TouchableOpacity
              style={styles.distanceButton}
              onPress={() => handleDistanceChange(DISTANCE_STEP)}
            >
              <Ionicons name="add-outline" size={18} color="#1F2937" />
            </TouchableOpacity>
          </View>
        </View>

        {nearbyCharities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="compass-outline" size={28} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No charities found</Text>
            <Text style={styles.emptyMessage}>
              Try increasing your radius or updating your location to discover more charities nearby.
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.charityList} showsVerticalScrollIndicator={false}>
            {nearbyCharities.map((charity) => (
              <TouchableOpacity
                key={charity.id}
                style={styles.charityCard}
                onPress={() => handleCharityPress(charity)}
              >
                <View style={styles.charityIcon}>
                  <Ionicons name="home-outline" size={18} color="#2563EB" />
                </View>
                <View style={styles.charityInfo}>
                  <Text style={styles.charityName}>{charity.name}</Text>
                  <Text style={styles.charityMeta}>
                    {charity.category} • {charity.location?.city}
                  </Text>
                </View>
                <View style={styles.distancePill}>
                  <Ionicons name="navigate-outline" size={14} color="#1F2937" />
                  <Text style={styles.distanceText}>{formatDistance(charity.distance)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    maxHeight: '45%',
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  overlayWarning: {
    marginTop: 4,
    fontSize: 13,
    color: '#EF4444',
  },
  locateButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  distanceBlock: {
    marginBottom: 12,
  },
  distanceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 10,
  },
  distanceControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  distanceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    marginRight: 14,
  },
  distanceValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 14,
  },
  charityList: {
    marginHorizontal: -4,
  },
  charityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  charityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  charityInfo: {
    flex: 1,
  },
  charityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  charityMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  distanceText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
  },
  emptyMessage: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
  },
});

export default LocalCharityMapScreen;
