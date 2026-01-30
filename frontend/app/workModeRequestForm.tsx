import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import API_BASE_URL from '../config';

const API = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
});

const WorkModeRequestForm = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    from_date: '',
    to_date: '',
    reason: '',
  });
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [tempFromDate, setTempFromDate] = useState(new Date());
  const [tempToDate, setTempToDate] = useState(new Date());

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

  const onFromDateChange = (event: any, selectedDate?: Date) => {
    setShowFromDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTempFromDate(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setFormData({ ...formData, from_date: formattedDate });
    }
  };

  const onToDateChange = (event: any, selectedDate?: Date) => {
    setShowToDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTempToDate(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setFormData({ ...formData, to_date: formattedDate });
    }
  };

  const showFromDatePickerModal = () => {
    setShowFromDatePicker(true);
  };

  const showToDatePickerModal = () => {
    setShowToDatePicker(true);
  };

  const handleSubmitRequest = async () => {
    if (!formData.from_date || !formData.to_date || !formData.reason.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'User not loaded');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        employee_id: currentUser.emp_id,
        employee_name: currentUser.name,
        department: currentUser.department,
        from_date: formData.from_date,
        to_date: formData.to_date,
        reason: formData.reason,
      };

      const response = await API.post('wfh/create/', requestData);

      Alert.alert('Success', 'WFH request submitted successfully');
      setFormData({ from_date: '', to_date: '', reason: '' });
      
      // Navigate to Active Requests page
      router.push('/workModeActiveRequests');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to submit request';

      // If home location not verified, redirect to setup
      if (errorMessage.includes('Home location not verified')) {
        Alert.alert(
          'Home Location Required',
          'You need to set up and verify your home location before requesting WFH.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Set Up Home Location',
              onPress: () => router.push('/homeLocationSetup'),
            },
          ]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#ec407a', '#641b9a']} style={styles.container}>
      <Text style={styles.title}>Work From Home Request</Text>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Apply for temporary work from home permission
        </Text>

        <Text style={styles.label}>From Date</Text>
        <TouchableOpacity style={styles.dateButton} onPress={showFromDatePickerModal}>
          <Text style={styles.dateButtonText}>
            {formData.from_date || 'Select From Date'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>To Date</Text>
        <TouchableOpacity style={styles.dateButton} onPress={showToDatePickerModal}>
          <Text style={styles.dateButtonText}>
            {formData.to_date || 'Select To Date'}
          </Text>
        </TouchableOpacity>

        {showFromDatePicker && (
          <DateTimePicker
            value={tempFromDate}
            mode="date"
            display="default"
            onChange={onFromDateChange}
            minimumDate={new Date()}
          />
        )}

        {showToDatePicker && (
          <DateTimePicker
            value={tempToDate}
            mode="date"
            display="default"
            onChange={onToDateChange}
            minimumDate={formData.from_date ? new Date(formData.from_date) : new Date()}
          />
        )}

        <Text style={styles.label}>Reason</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Please provide a detailed reason for your WFH request (e.g. family emergency, medical appointment, etc.)"
          value={formData.reason}
          onChangeText={(text) => setFormData({ ...formData, reason: text })}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmitRequest} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>Submit Request</Text>}
        </TouchableOpacity>
      </ScrollView>

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
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  label: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  dateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#ec407a',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  submitText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
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

export default WorkModeRequestForm;
