import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

const API = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
});

const WorkModeRequestHistory = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [requests, setRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

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

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (currentUser) {
        fetchRequests(currentUser.emp_id);
      }
    }, [currentUser])
  );

  const fetchRequests = async (empId: string) => {
    try {
      const response = await API.get(`/wfh/employee/${empId}/`);
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch requests', error);
    }
  };

  const onRefresh = async () => {
    if (currentUser) {
      setRefreshing(true);
      await fetchRequests(currentUser.emp_id);
      setRefreshing(false);
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
      {item.approved_by && (
        <Text style={styles.requestApprovedBy}>
          {item.status === 'Approved' ? 'Approved' : 'Rejected'} by: {item.approved_by}
        </Text>
      )}
      <Text style={styles.requestTimestamp}>
        Requested on: {new Date(item.created_at).toLocaleDateString()}
      </Text>
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

  const historyRequests = requests
    .filter((req: any) => req.status !== 'Pending')
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <LinearGradient colors={['#ec407a', '#641b9a']} style={styles.container}>
      <Text style={styles.title}>WFH Request History</Text>

      <Text style={styles.subtitle}>
        Previously approved or rejected requests
      </Text>

      <FlatList
        data={historyRequests}
        keyExtractor={(item: any, index: number) => `${item.id}-${index}`}
        renderItem={renderRequestItem}
        style={styles.listContainer}
        contentContainerStyle={historyRequests.length === 0 ? styles.emptyContainer : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ec407a']}
            tintColor="#ec407a"
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No request history</Text>
        }
      />

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
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 30,
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
  requestTimestamp: {
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

export default WorkModeRequestHistory;
