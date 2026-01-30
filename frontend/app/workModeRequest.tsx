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
  FlatList,
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

const WorkModeRequest = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('form');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
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
          const user = JSON.parse(userJson);
          setCurrentUser(user);
          fetchRequests(user.emp_id);
        }
      } catch (err) {
        console.error('Failed to load user', err);
      }
    };
    fetchUser();
  }, []);

  const fetchRequests = async (empId: string) => {
    try {
      const response = await API.get(`/wfh/employee/${empId}/`);
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch requests', error);
    }
  };

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

      // Navigate to Active Requests tab after successful submission
      console.log('Switching to Active Requests tab');
      setActiveTab('active');

      // Refresh data to show the newly submitted request
      setTimeout(() => {
        console.log('Refreshing requests data after submission');
        fetchRequests(currentUser.emp_id);
      }, 500); // Small delay to ensure tab switch completes
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

  const renderRequestItem = ({ item }: any) => (
    <View style={styles.requestItem}>
      <Text style={styles.requestDates}>
        {new Date(item.from_date).toLocaleDateString()} - {new Date(item.to_date).toLocaleDateString()}
      </Text>
      <Text style={styles.requestReason}>{item.reason}</Text>
      <Text style={[styles.requestStatus, getStatusStyle(item.status)]}>
        {item.status}
      </Text>
      {item.status === 'Approved' && item.approved_by && (
        <Text style={styles.requestApprovedBy}>Approved by: {item.approved_by}</Text>
      )}
    </View>
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Approved':
        return styles.statusApproved;
      case 'Rejected':
        return styles.statusRejected;
      default:
        return styles.statusPending;
    }
  };

  const activeRequests = requests.filter((req: any) => req.status === 'Pending');
  const requestHistory = requests.filter((req: any) => req.status !== 'Pending').sort((a: any, b: any) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

  const renderHistoryItem = ({ item }: any) => (
    <View style={styles.historyItem}>
      <View style={styles.historyInfo}>
        <Text style={styles.historyDates}>
          {new Date(item.from_date).toLocaleDateString()} - {new Date(item.to_date).toLocaleDateString()}
        </Text>
        <Text style={styles.historyReason}>{item.reason}</Text>
        <Text style={[styles.historyStatus, getHistoryStatusStyle(item.status)]}>
          {item.status}
        </Text>
        {item.approved_by && (
          <Text style={styles.historyApprovedBy}>
            Action by: {item.approved_by}
          </Text>
        )}
        <Text style={styles.historyTimestamp}>
          {item.status === 'Approved' ? 'Approved' : 'Rejected'} on: {new Date(item.updated_at || item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  const getHistoryStatusStyle = (status: string) => {
    switch (status) {
      case 'Approved':
        return styles.historyStatusApproved;
      case 'Rejected':
        return styles.historyStatusRejected;
      default:
        return styles.historyStatusPending;
    }
  };

  // Home location status for WFH employees
  const getHomeLocationStatus = () => {
    if (!currentUser) return null;

    const isHomeSet = currentUser.home_lat && currentUser.home_lng;
    const isVerified = currentUser.home_verified;

    return {
      icon: isVerified ? '✅' : isHomeSet ? '⏳' : '❌',
      text: isVerified ? 'Approved' : isHomeSet ? 'Pending Admin Approval' : 'Not Set',
      color: isVerified ? '#4CAF50' : isHomeSet ? '#FF9800' : '#F44336',
      canRequestWFH: isVerified
    };
  };

  const homeStatus = getHomeLocationStatus();

  return (
    <LinearGradient colors={['#ec407a', '#641b9a']} style={styles.container}>
      <Text style={styles.title}>Work Mode Request</Text>

      {/* Home Location Status for WFH employees */}
      {currentUser && currentUser.employment_type === 'WFH' && homeStatus && (
        <View style={styles.homeStatusContainer}>
          <View style={styles.homeStatusIconWrapper}>
            <Text style={styles.homeStatusIcon}>{homeStatus.icon}</Text>
          </View>
          <View style={styles.homeStatusTextContainer}>
            <Text style={styles.homeStatusTitle}>Home Location Status</Text>
            <Text style={[styles.homeStatusText, { color: homeStatus.color }]}>
              {homeStatus.text}
            </Text>
            {!homeStatus.canRequestWFH && (
              <Text style={styles.homeStatusNote}>
                Note: You need approved home location to work from home
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'form' && styles.activeTab]}
          onPress={() => setActiveTab('form')}
        >
          <Text style={[styles.tabText, activeTab === 'form' && styles.activeTabText]}>Request Form</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Active Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Request History</Text>
        </TouchableOpacity>
      </View>

      {/* Request Form */}
      {activeTab === 'form' && (
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
      )}

      {/* Active Requests */}
      {activeTab === 'active' && (
        <FlatList
          data={activeRequests}
          keyExtractor={(item: any, index: number) => `${item.id}-${index}`}
          renderItem={renderRequestItem}
          style={styles.listContainer}
          contentContainerStyle={activeRequests.length === 0 ? styles.emptyContainer : null}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No active requests</Text>
          }
        />
      )}

      {/* Request History */}
      {activeTab === 'history' && (
        <FlatList
        data={requestHistory}
          keyExtractor={(item: any, index: number) => `${item.id}-${index}`}
          renderItem={renderHistoryItem}
          style={styles.listContainer}
          contentContainerStyle={requestHistory.length === 0 ? styles.emptyContainer : null}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No request history</Text>
          }
        />
      )}

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
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    marginHorizontal: 5,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  tabText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  activeTabText: {
    color: '#ec407a',
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
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 15,
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
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  requestDates: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  requestReason: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  requestStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statusApproved: {
    color: 'green',
  },
  statusRejected: {
    color: 'red',
  },
  statusPending: {
    color: 'orange',
  },
  requestApprovedBy: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: 'white',
    fontSize: 16,
    marginTop: 50,
  },
  backButton: {
    margin: 20,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
  },
  historyItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  historyInfo: {
    flex: 1,
  },
  historyDates: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  historyReason: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  historyStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  historyStatusApproved: {
    color: 'green',
  },
  historyStatusRejected: {
    color: 'red',
  },
  historyStatusPending: {
    color: 'orange',
  },
  historyApprovedBy: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  historyTimestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic',
  },
  backButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  homeStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  homeStatusIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  homeStatusIcon: {
    fontSize: 20,
  },
  homeStatusTextContainer: {
    flex: 1,
  },
  homeStatusTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  homeStatusText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  homeStatusNote: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
});

export default WorkModeRequest;
