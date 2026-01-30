import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import timesheetService from './services/timesheetService';

interface TimesheetHistoryItem {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  total_hours: number;
  activities_count: number;
  reviewer_name?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

interface TimesheetHistoryData {
  employee_id: string;
  total_timesheets: number;
  timesheets: TimesheetHistoryItem[];
}

const TimesheetHistory = () => {
  const [historyData, setHistoryData] = useState<TimesheetHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      console.log('[DEBUG] Raw user data from AsyncStorage:', userData);
      if (userData) {
        const user = JSON.parse(userData);
        console.log('[DEBUG] Parsed user object:', user);
        console.log('[DEBUG] Employee ID found:', user.emp_id);
        setEmployeeId(user.emp_id);
      } else {
        console.log('[DEBUG] No user data found in AsyncStorage');
        Alert.alert('Error', 'User not logged in. Please login again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load user data');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      loadTimesheetHistory();
    }
  }, [employeeId]);

  const loadTimesheetHistory = async () => {
    try {
      setLoading(true);
      const result = await timesheetService.getEmployeeTimesheetHistory(employeeId);

      if (result.success && result.data) {
        setHistoryData(result.data);
      } else {
        Alert.alert('Error', result.message || 'Failed to load timesheet history');
      }
    } catch (error) {
      console.error('Error loading timesheet history:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10B981'; // Green
      case 'rejected':
        return '#EF4444'; // Red
      case 'pending':
        return '#F59E0B'; // Yellow
      default:
        return '#6B7280'; // Gray
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#ec407a', '#641b9a']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading timesheet history...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#ec407a', '#641b9a']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Timesheet History</Text>

        {historyData && historyData.timesheets.length > 0 ? (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>
                Total Timesheets: {historyData.total_timesheets}
              </Text>
            </View>

            <View style={styles.historyList}>
              {historyData.timesheets.map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.dateSection}>
                      <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                      <Text style={styles.dayText}>
                        {new Date(item.date).toLocaleDateString('en-US', { weekday: 'long' })}
                      </Text>
                    </View>
                    <View style={styles.statusSection}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(item.status) }
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {getStatusText(item.status)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Total Hours</Text>
                        <Text style={styles.statValue}>{item.total_hours}h</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Activities</Text>
                        <Text style={styles.statValue}>{item.activities_count}</Text>
                      </View>
                    </View>

                    {item.reviewer_name && (
                      <View style={styles.reviewerSection}>
                        <Text style={styles.reviewerLabel}>Reviewed by:</Text>
                        <Text style={styles.reviewerText}>{item.reviewer_name}</Text>
                        {item.reviewed_at && (
                          <Text style={styles.reviewDateText}>
                            on {formatDate(item.reviewed_at)}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No timesheet history found</Text>
            <Text style={styles.emptySubtext}>
              Your submitted timesheets will appear here once they are reviewed
            </Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 10,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  summaryText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  historyList: {
    gap: 12,
    paddingHorizontal: 16,
  },
  historyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dateSection: {
    flex: 1,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  dayText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 2,
  },
  statusSection: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  reviewerSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
  },
  reviewerLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginBottom: 4,
  },
  reviewerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewDateText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TimesheetHistory;
