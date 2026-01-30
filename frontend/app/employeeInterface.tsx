import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import API_BASE_URL from '../config';

const API = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
});

const EmployeeInterface = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchUserData = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        console.log('Current user:', user);
        console.log('Employment type:', user.employment_type);
        setCurrentUser(user);
      }
    } catch (err) {
      console.error('Failed to load user', err);
    }
  };

  const refreshUserData = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        // Fetch fresh user data from server
        const response = await API.get(`/employees/${user.emp_id}/`);
        if (response.data) {
          // Update AsyncStorage with fresh data
          await AsyncStorage.setItem('user', JSON.stringify(response.data));
          setCurrentUser(response.data);
        }
      }
    } catch (err) {
      console.error('Failed to refresh user data', err);
    }
  };

  useEffect(() => {
    fetchUserData();
    // Refresh user data when entering the interface
    refreshUserData();
  }, []);

  return (
    <LinearGradient colors={['#ec407a', '#641b9a']} style={styles.container}>
      <Text style={styles.title}>Employee Portal</Text>
      
      <View style={styles.buttonContainer}>
        <View style={styles.iconWrapper}>
          <Image source={require('../assets/images/dashboard (2).png')} style={styles.icon} />
        </View>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/profile')}>
          <Text style={styles.buttonText}>Profile</Text>
        </TouchableOpacity>
      </View>

      {currentUser && (currentUser.employment_type === 'WFO' || currentUser.employment_type === 'WFH') && (
        <View style={styles.buttonContainer}>
          <View style={styles.iconWrapper}>
            <Image source={require('../assets/images/home-loc.jpeg')} style={styles.icon} />
          </View>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/homeLocationSetup')}>
            <Text style={styles.buttonText}>
              {currentUser.home_verified ? 'Change Home Location' : 'Set Home Location'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Home Location Status Display for WFH employees */}
      {currentUser && currentUser.employment_type === 'WFH' && (
        <View style={styles.statusContainer}>
          <View style={styles.statusIconWrapper}>
            <Text style={styles.statusIcon}>
              {currentUser.home_verified ? '✅' : currentUser.home_lat ? '⏳' : '❌'}
            </Text>
          </View>
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Home Location Status</Text>
            <Text style={[
              styles.statusText,
              {
                color: currentUser.home_verified ? '#4CAF50' :
                       currentUser.home_lat ? '#FF9800' : '#F44336'
              }
            ]}>
              {currentUser.home_verified ? 'Approved' :
               currentUser.home_lat ? 'Pending Admin Approval' : 'Not Set'}
            </Text>
          </View>
        </View>
      )}

      {currentUser && currentUser.employment_type === 'WFO' && (
        <View style={styles.buttonContainer}>
          <View style={styles.iconWrapper}>
            <Image source={require('../assets/images/WFH-requests.jpeg')} style={styles.icon} />
          </View>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/workModeRequest')}>
            <Text style={styles.buttonText}>Work Mode Request</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <View style={styles.iconWrapper}>
          <Image source={require('../assets/images/punch10.png')} style={styles.icon} />
        </View>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/punch')}>
          <Text style={styles.buttonText}>Punch</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <View style={styles.iconWrapper}>
          <Image source={require('../assets/images/requests6.png')} style={styles.icon} />
        </View>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/requests')}>
          <Text style={styles.buttonText}>Requests</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <View style={styles.iconWrapper}>
          <Image source={require('../assets/images/leave5.png')} style={styles.icon} />
        </View>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/leave')}>
          <Text style={styles.buttonText}>Leave</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <View style={styles.iconWrapper}>
          <Image source={require('../assets/images/requests6.png')} style={styles.icon} />
        </View>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/timesheet')}>
          <Text style={styles.buttonText}>Timesheet</Text>
        </TouchableOpacity>
      </View>

      {currentUser && currentUser.department === 'Hardware' && (
        <View style={styles.buttonContainer}>
          <View style={styles.iconWrapper}>
            <Image source={require('../assets/images/requests6.png')} style={styles.icon} />
          </View>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/jobsheet')}>
            <Text style={styles.buttonText}>Jobsheet</Text>
          </TouchableOpacity>
        </View>
      )}

    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 35,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 40,
    textAlign: 'center',
    fontFamily: 'serif',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginBottom: 20,
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -25,
    zIndex: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  icon: {
    width: 34,
    height: 44,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    paddingRight: 20,
    paddingLeft: 40, // Space for the icon
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
  },
  statusIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  statusIcon: {
    fontSize: 24,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statusText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EmployeeInterface;
