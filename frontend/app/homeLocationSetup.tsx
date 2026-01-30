import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

const API = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
});

const HomeLocationSetup = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [homeLocation, setHomeLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          setCurrentUser(JSON.parse(userJson));
        }
      } catch (err) {
        console.error('Failed to load user', err);
      }
    };
    fetchUser();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to set home location');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      Alert.alert('Error', 'Failed to request location permission');
      return false;
    }
  };

  const captureHomeLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    setLoading(true);
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        mayShowUserSettingsDialog: true,
      });

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setHomeLocation(coords);

      Alert.alert(
        'Location Captured',
        `Lat: ${coords.latitude.toFixed(6)}, Lon: ${coords.longitude.toFixed(6)}\n\nThis will be saved as your home location and sent for admin approval.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: () => saveHomeLocation(coords),
          },
        ]
      );
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to capture location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveHomeLocation = async (coords: { latitude: number; longitude: number }) => {
    if (!currentUser) {
      Alert.alert('Error', 'User not loaded');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        emp_id: currentUser.emp_id,
        home_lat: coords.latitude,
        home_lng: coords.longitude,
      };

      const response = await API.post('/employee/home-location/set/', requestData);

      Alert.alert(
        'Success',
        'Home location saved successfully. It is now pending admin approval. You will be notified once approved.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save home location');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#ec407a', '#641b9a']} style={styles.container}>
      <Text style={styles.title}>Home Location Setup</Text>

      <View style={styles.content}>
        <Text style={styles.description}>
          To work from home, you need to set up and verify your home location.
          This location will be used to validate your attendance when working remotely.
        </Text>

        <Text style={styles.instructions}>
          1. Ensure you are at your home location{'\n'}
          2. Tap "Capture Home Location" to record your current position{'\n'}
          3. Your location will be sent for admin approval{'\n'}
          4. Once approved, you can request WFH
        </Text>

        {homeLocation && (
          <View style={styles.locationDisplay}>
            <Text style={styles.locationText}>
              Captured Location:{'\n'}
              Latitude: {homeLocation.latitude.toFixed(6)}{'\n'}
              Longitude: {homeLocation.longitude.toFixed(6)}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.captureButton}
          onPress={captureHomeLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.captureButtonText}>Capture Home Location</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          Note: Make sure you are at your actual home location when capturing.
          This location will be used for all future WFH attendance verification.
        </Text>
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  description: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  instructions: {
    color: 'white',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
  },
  locationDisplay: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  locationText: {
    color: '#333',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  captureButton: {
    backgroundColor: '#ec407a',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  captureButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  note: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  backButton: {
    margin: 20,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default HomeLocationSetup;
