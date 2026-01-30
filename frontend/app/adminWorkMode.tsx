import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

const API = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
});

const AdminWorkMode = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('employees');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [wfhRequests, setWfhRequests] = useState([]);
  const [unverifiedLocations, setUnverifiedLocations] = useState([]);
  const [requestHistory, setRequestHistory] = useState([]);

  useEffect(() => {
    fetchEmployees();
    fetchWfhRequests();
    fetchUnverifiedLocations();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await API.get('/employees/');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees', error);
    }
  };

  const fetchWfhRequests = async () => {
    try {
      const response = await API.get('wfh/admin/all/');
      setWfhRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch WFH requests', error);
    }
  };

  const fetchUnverifiedLocations = async () => {
    try {
      const response = await API.get('/admin/unverified-home-locations/');
      setUnverifiedLocations(response.data);
    } catch (error) {
      console.error('Failed to fetch unverified locations', error);
    }
  };

  const updateEmployeeWorkMode = async (empId: string, employmentType: string) => {
    setLoading(true);
    try {
      await API.post('/employee/work-mode/update/', {
        emp_id: empId,
        employment_type: employmentType,
      });

      Alert.alert('Success', 'Employee work mode updated successfully');
      fetchEmployees();
    } catch (error) {
      Alert.alert('Error', 'Failed to update employee work mode');
    } finally {
      setLoading(false);
    }
  };

  const updateWfhRequestStatus = async (requestId: string, status: string) => {
    setLoading(true);
    try {
      await API.post('wfh/admin/update-status/', {
        request_id: requestId,
        status: status,
        admin_id: 'Admin', // You might want to get actual admin ID
      });

      Alert.alert('Success', `WFH request ${status.toLowerCase()} successfully`);

      // Automatically switch to history tab and refresh data
      console.log('Switching to History tab after approval/rejection');
      setActiveTab('history');

      // Refresh data to show the updated request in history
      setTimeout(() => {
        console.log('Refreshing WFH requests data after action');
        fetchWfhRequests();
      }, 500); // Small delay to ensure tab switch completes
    } catch (error) {
      Alert.alert('Error', 'Failed to update WFH request status');
    } finally {
      setLoading(false);
    }
  };

  const approveHomeLocation = async (empId: string) => {
    setLoading(true);
    try {
      await API.post('/employee/home-location/approve/', {
        emp_id: empId,
        approved: true,
      });

      Alert.alert('Success', 'Home location approved successfully');
      fetchUnverifiedLocations();
      fetchEmployees();
    } catch (error) {
      Alert.alert('Error', 'Failed to approve home location');
    } finally {
      setLoading(false);
    }
  };

  const rejectHomeLocation = async (empId: string) => {
    setLoading(true);
    try {
      await API.post('/employee/home-location/approve/', {
        emp_id: empId,
        approved: false,
      });

      Alert.alert('Success', 'Home location rejected');
      fetchUnverifiedLocations();
      fetchEmployees();
    } catch (error) {
      Alert.alert('Error', 'Failed to reject home location');
    } finally {
      setLoading(false);
    }
  };

  const renderEmployeeItem = ({ item }: any) => (
    <View style={styles.employeeItem}>
      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>{item.name}</Text>
        <Text style={styles.employeeId}>{item.emp_id}</Text>
        <Text style={styles.employeeDept}>{item.department}</Text>
      </View>

      <View style={styles.employeeControls}>
        <Text style={styles.currentMode}>
          Current: {item.employment_type || 'WFO'}
        </Text>
        <Text style={styles.homeStatus}>
          Home: {item.home_verified ? 'Verified' : item.home_lat ? 'Pending' : 'Not Set'}
        </Text>

        <View style={styles.modeButtons}>
          {['WFO', 'WFH'].map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.modeButton,
                item.employment_type === mode && styles.activeModeButton
              ]}
              onPress={() => updateEmployeeWorkMode(item.emp_id, mode)}
              disabled={loading}
            >
              <Text style={[
                styles.modeButtonText,
                item.employment_type === mode && styles.activeModeButtonText
              ]}>
                {mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderWfhRequestItem = ({ item }: any) => (
    <View style={styles.requestItem}>
      <View style={styles.requestInfo}>
        <Text style={styles.requestEmployee}>{item.employee_name}</Text>
        <Text style={styles.requestDates}>
          {new Date(item.from_date).toLocaleDateString()} - {new Date(item.to_date).toLocaleDateString()}
        </Text>
        <Text style={styles.requestReason}>{item.reason}</Text>
        <Text style={styles.requestDept}>{item.department}</Text>
      </View>

      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => updateWfhRequestStatus(item.id, 'Approved')}
          disabled={loading}
        >
          <Text style={styles.approveButtonText}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => updateWfhRequestStatus(item.id, 'Rejected')}
          disabled={loading}
        >
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLocationItem = ({ item }: any) => (
    <View style={styles.locationItem}>
        <View style={styles.locationInfo}>
          <Text style={styles.locationEmployee}>{item.name} ({item.emp_id})</Text>
          <Text style={styles.locationDept}>{item.department}</Text>
          <Text style={styles.locationAddress}>
            {item.home_address || `Lat: ${item.home_lat?.toFixed(6)}, Lng: ${item.home_lng?.toFixed(6)}`}
          </Text>
          <Text style={styles.locationType}>Type: {item.employment_type}</Text>
        </View>

      <View style={styles.locationActions}>
        <TouchableOpacity
          style={[styles.locationButton, styles.approveLocationButton]}
          onPress={() => approveHomeLocation(item.emp_id)}
          disabled={loading}
        >
          <Text style={styles.approveLocationText}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.locationButton, styles.rejectLocationButton]}
          onPress={() => rejectHomeLocation(item.emp_id)}
          disabled={loading}
        >
          <Text style={styles.rejectLocationText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHistoryItem = ({ item }: any) => (
    <View style={styles.historyItem}>
      <View style={styles.historyInfo}>
        <Text style={styles.historyEmployee}>{item.employee_name}</Text>
        <Text style={styles.historyDates}>
          {new Date(item.from_date).toLocaleDateString()} - {new Date(item.to_date).toLocaleDateString()}
        </Text>
        <Text style={styles.historyReason}>{item.reason}</Text>
        <Text style={styles.historyDept}>{item.department}</Text>
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

  return (
    <LinearGradient colors={['#ec407a', '#641b9a']} style={styles.container}>
      <Text style={styles.title}>Work Mode Management</Text>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'employees' && styles.activeTab]}
          onPress={() => setActiveTab('employees')}
        >
          <Text style={[styles.tabText, activeTab === 'employees' && styles.activeTabText]}>
            Employees
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            WFH Requests
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'locations' && styles.activeTab]}
          onPress={() => setActiveTab('locations')}
        >
          <Text style={[styles.tabText, activeTab === 'locations' && styles.activeTabText]}>
            Home Locations
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <FlatList
          data={employees}
          keyExtractor={(item: any, index: number) => `${item.emp_id}-${index}`}
          renderItem={renderEmployeeItem}
          style={styles.listContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>No employees found</Text>}
        />
      )}

      {/* WFH Requests Tab */}
      {activeTab === 'requests' && (
        <FlatList
          data={wfhRequests.filter((req: any) => req.status === 'Pending')}
          keyExtractor={(item: any, index: number) => `${item.id}-${index}`}
          renderItem={renderWfhRequestItem}
          style={styles.listContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>No pending WFH requests</Text>}
        />
      )}

      {/* Home Locations Tab */}
      {activeTab === 'locations' && (
        <FlatList
          data={unverifiedLocations}
          keyExtractor={(item: any, index: number) => `${item.emp_id}-${index}`}
          renderItem={renderLocationItem}
          style={styles.listContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>No unverified home locations</Text>}
        />
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <FlatList
            data={wfhRequests.filter((req: any) => req.status !== 'Pending').sort((a: any, b: any) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())}
          keyExtractor={(item: any, index: number) => `${item.id}-${index}`}
          renderItem={renderHistoryItem}
          style={styles.listContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>No request history</Text>}
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
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginBottom: 15,
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
    paddingLeft: 40,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
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
    fontSize: 12,
    textAlign: 'center',
  },
  activeTabText: {
    color: '#ec407a',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  employeeItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  employeeId: {
    fontSize: 14,
    color: '#666',
  },
  employeeDept: {
    fontSize: 12,
    color: '#888',
  },
  employeeControls: {
    alignItems: 'flex-end',
  },
  currentMode: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  homeStatus: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  modeButtons: {
    flexDirection: 'row',
  },
  modeButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ec407a',
    marginHorizontal: 2,
  },
  activeModeButton: {
    backgroundColor: '#ec407a',
  },
  modeButtonText: {
    fontSize: 12,
    color: '#ec407a',
  },
  activeModeButtonText: {
    color: 'white',
  },
  requestItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  requestInfo: {
    marginBottom: 10,
  },
  requestEmployee: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  requestDates: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  requestReason: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
  requestDept: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  approveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  rejectButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  locationItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  locationInfo: {
    marginBottom: 10,
  },
  locationEmployee: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  locationDept: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  locationCoords: {
    fontSize: 12,
    color: '#555',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  locationAddress: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  locationType: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  locationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  approveLocationButton: {
    backgroundColor: '#4CAF50',
  },
  rejectLocationButton: {
    backgroundColor: '#f44336',
  },
  approveLocationText: {
    color: 'white',
    fontWeight: 'bold',
  },
  rejectLocationText: {
    color: 'white',
    fontWeight: 'bold',
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
  historyEmployee: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  historyDates: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  historyReason: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
  historyDept: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
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
  backButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AdminWorkMode;
