import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import jobsheetService, { JobsheetReviewListItem } from './services/jobsheetService';

const { width } = Dimensions.get('window');

const JobsheetHistoryScreen = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [jobsheets, setJobsheets] = useState<JobsheetReviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter state
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'weekly' | 'monthly'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'rejected'>('all');

  // Status colors
  const STATUS_COLORS = {
    APPROVED: '#10b981',
    REJECTED: '#ef4444',
    SUBMITTED: '#f59e0b',
    DRAFT: '#6b7280',
  };

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadJobsheets();
    }
  }, [currentUser, filterPeriod, filterStatus]);

  const loadUserData = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('user');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadJobsheets = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      // Calculate date range based on filter
      const dateRange = getDateRange(filterPeriod);
      
      const result = await jobsheetService.getJobsheetsForReview(currentUser.emp_id, {
        from_date: dateRange.from,
        to_date: dateRange.to,
        status: filterStatus === 'all' ? undefined : filterStatus.toUpperCase(),
      });

      if (result.success && result.data) {
        // Filter for only validated jobsheets (approved/rejected)
        const validatedJobsheets = result.data.filter(job => 
          job.status === 'APPROVED' || job.status === 'REJECTED'
        );
        setJobsheets(validatedJobsheets);
      } else {
        Alert.alert('Error', result.error || 'Failed to load jobsheets');
        setJobsheets([]);
      }
    } catch (error) {
      console.error('Error loading jobsheets:', error);
      Alert.alert('Error', 'Failed to load jobsheets');
      setJobsheets([]);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (period: string) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Set to start of day
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    startOfMonth.setHours(0, 0, 0, 0);

    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    switch (period) {
      case 'weekly':
        return {
          from: formatDate(startOfWeek),
          to: formatDate(today)
        };
      case 'monthly':
        return {
          from: formatDate(startOfMonth),
          to: formatDate(today)
        };
      default:
        return {
          from: '',
          to: ''
        };
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadJobsheets();
  }, [currentUser, filterPeriod, filterStatus]);

  const clearFilters = () => {
    setFilterPeriod('all');
    setFilterStatus('all');
  };

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.DRAFT;
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

  const getFilterLabel = () => {
    switch (filterPeriod) {
      case 'weekly':
        return 'This Week';
      case 'monthly':
        return 'This Month';
      default:
        return 'All Time';
    }
  };

  const getStatusFilterLabel = () => {
    switch (filterStatus) {
      case 'approved':
        return 'Approved Only';
      case 'rejected':
        return 'Rejected Only';
      default:
        return 'All Validated';
    }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Feather name={icon} size={20} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  if (loading && jobsheets.length === 0) {
    return (
      <LinearGradient colors={["#ec407a", "#641b9a"]} style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />
        
        <View style={styles.loadingContainer}>
          <Feather name="loader" size={40} color="#fff" style={styles.loadingIcon} />
          <Text style={styles.loadingText}>Loading jobsheets...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Calculate stats
  const stats = {
    total: jobsheets.length,
    approved: jobsheets.filter(j => j.status === 'APPROVED').length,
    rejected: jobsheets.filter(j => j.status === 'REJECTED').length,
  };

  return (
    <LinearGradient colors={["#ec407a", "#641b9a"]} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Validated"
            value={stats.total}
            icon="file-text"
            color="#6366f1"
          />
          <StatCard
            title="Approved"
            value={stats.approved}
            icon="check-circle"
            color="#10b981"
          />
          <StatCard
            title="Rejected"
            value={stats.rejected}
            icon="x-circle"
            color="#ef4444"
          />
          <StatCard
            title="Success Rate"
            value={`${stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%`}
            icon="trending-up"
            color="#10b981"
          />
        </View>

        {/* Filters Section */}
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersTitle}>Filter Options</Text>
          
          {/* Time Period Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Time Period</Text>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterPeriod === 'all' && styles.activeFilterButton
                ]}
                onPress={() => setFilterPeriod('all')}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterPeriod === 'all' && styles.activeFilterButtonText
                ]}>
                  All Time
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterPeriod === 'weekly' && styles.activeFilterButton
                ]}
                onPress={() => setFilterPeriod('weekly')}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterPeriod === 'weekly' && styles.activeFilterButtonText
                ]}>
                  Weekly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterPeriod === 'monthly' && styles.activeFilterButton
                ]}
                onPress={() => setFilterPeriod('monthly')}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterPeriod === 'monthly' && styles.activeFilterButtonText
                ]}>
                  Monthly
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Status Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterStatus === 'all' && styles.activeFilterButton
                ]}
                onPress={() => setFilterStatus('all')}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterStatus === 'all' && styles.activeFilterButtonText
                ]}>
                  All Validated
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterStatus === 'approved' && styles.activeFilterButton
                ]}
                onPress={() => setFilterStatus('approved')}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterStatus === 'approved' && styles.activeFilterButtonText
                ]}>
                  Approved
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterStatus === 'rejected' && styles.activeFilterButton
                ]}
                onPress={() => setFilterStatus('rejected')}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterStatus === 'rejected' && styles.activeFilterButtonText
                ]}>
                  Rejected
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearFilters}
            >
              <Feather name="x" size={18} color="#6b7280" />
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Filter Display */}
        <View style={styles.currentFilterContainer}>
          <Text style={styles.currentFilterLabel}>Current Filter:</Text>
          <Text style={styles.currentFilterValue}>
            {getFilterLabel()} • {getStatusFilterLabel()}
          </Text>
        </View>

        {/* Jobsheets List */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            Validated Jobsheets ({stats.total})
          </Text>
          <TouchableOpacity style={styles.sortButton}>
            <Feather name="calendar" size={18} color="#6b7280" />
            <Text style={styles.sortButtonText}>Sorted by Date</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.jobsheetsList}>
          {jobsheets.length > 0 ? (
            jobsheets.map((job) => (
              <TouchableOpacity key={job.id} style={styles.jobsheetCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.jobsheetId}>{job.job_sheet_no}</Text>
                    <Text style={styles.employeeName}>{job.engineer_name}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(job.status) + '15' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(job.status) },
                      ]}
                    >
                      {job.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <Feather name="briefcase" size={14} color="#6b7280" />
                    <Text style={styles.detailText}>{job.customer_name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Feather name="map-pin" size={14} color="#6b7280" />
                    <Text style={styles.detailText}>{job.customer_location}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Feather name="calendar" size={14} color="#6b7280" />
                    <Text style={styles.detailText}>
                      Service: {formatDate(job.service_date)}
                    </Text>
                  </View>
                  {job.review && (
                    <View style={styles.detailRow}>
                      <Feather name="user-check" size={14} color="#6b7280" />
                      <Text style={styles.detailText}>
                        Reviewed by: {job.review.reviewedBy?.name || 'Unknown'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardFooter}>
                  <Feather name="check-circle" size={18} color="#10b981" />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="file-text" size={48} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No Validated Jobsheets</Text>
              <Text style={styles.emptyText}>
                No jobsheets have been validated in the selected period.
              </Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={clearFilters}
              >
                <Text style={styles.refreshButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 25,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    paddingTop: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filtersContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeFilterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  filterButtonText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  currentFilterContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  currentFilterLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: 4,
  },
  currentFilterValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sortButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  jobsheetsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  jobsheetCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobsheetId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  employeeName: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  cardFooter: {
    alignItems: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
  refreshButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingIcon: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default JobsheetHistoryScreen;