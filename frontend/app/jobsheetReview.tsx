import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import jobsheetService, {
  JobsheetReviewListItem,
  JobsheetData,
  JobsheetReviewData
} from './services/jobsheetService';
import JobsheetHistoryScreen from './JobsheetHistoryScreen';

const { width } = Dimensions.get('window');

// Status colors for jobsheets
const STATUS_COLORS = {
  SUBMITTED: '#F59E0B', // Yellow
  APPROVED: '#10B981',  // Green
  REJECTED: '#EF4444',  // Red
  DRAFT: '#6B7280',     // Gray
};

// Content-only components without LinearGradient wrapper
const JobsheetReviewList = ({ onJobsheetPress }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [jobsheets, setJobsheets] = useState<JobsheetReviewListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadJobsheets();
    }
  }, [currentUser]);

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

    try {
      const result = await jobsheetService.getJobsheetsForReview(currentUser.emp_id);

      if (result.success && result.data) {
        setJobsheets(result.data);
      } else {
        Alert.alert('Error', result.error || 'Failed to load jobsheets');
      }
    } catch (error) {
      console.error('Error loading jobsheets:', error);
      Alert.alert('Error', 'Failed to load jobsheets');
    } finally {
      setLoading(false);
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

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.DRAFT;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading jobsheets...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Jobsheets List */}
      <View style={styles.listCard}>
        <Text style={styles.sectionTitle}>
          JOBSHEETS TO REVIEW ({jobsheets.length})
        </Text>

        {jobsheets.length > 0 ? (
          jobsheets.map((jobsheet) => (
            <TouchableOpacity
              key={jobsheet.id}
              onPress={() => onJobsheetPress(jobsheet)}
              style={styles.jobsheetCard}
            >
              <View style={styles.cardHeader}>
                <View style={styles.jobInfo}>
                  <Text style={styles.jobSheetNo}>{jobsheet.job_sheet_no}</Text>
                  <Text style={styles.engineerName}>{jobsheet.engineer_name}</Text>
                </View>
                <View style={styles.statusContainer}>
                  <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(jobsheet.status) }]}>
                    {jobsheet.status}
                  </Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.customerName}>{jobsheet.customer_name}</Text>
                <Text style={styles.customerLocation}>{jobsheet.customer_location}</Text>
                <Text style={styles.serviceDate}>
                  Service Date: {formatDate(jobsheet.service_date)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No jobsheets to review</Text>
            <Text style={styles.emptySubtext}>
              All jobsheets have been reviewed
            </Text>
          </View>
        )}
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

// Jobsheet Detail and Review Component
const JobsheetDetailReview = ({ jobsheetId, onBackPress, onReviewComplete }) => {
  const [jobsheet, setJobsheet] = useState<JobsheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: 'APPROVED' as 'APPROVED' | 'REJECTED',
    comment: '',
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    loadUserData();
    loadJobsheetDetails();
  }, [jobsheetId]);

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

  const loadJobsheetDetails = async () => {
    if (!jobsheetId) return;

    try {
      setLoading(true);
      const result = await jobsheetService.getJobsheetDetail(jobsheetId);

      if (result.success && result.data) {
        setJobsheet(result.data);
      } else {
        Alert.alert('Error', result.error || 'Failed to load jobsheet details');
      }
    } catch (error) {
      console.error('Error loading jobsheet details:', error);
      Alert.alert('Error', 'Failed to load jobsheet details');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!jobsheet || !currentUser) return;

    // Only require comment for REJECTED status
    if (reviewData.status === 'REJECTED') {
      if (!reviewData.comment || !reviewData.comment.trim()) {
        Alert.alert('Validation Error', 'Please provide a review comment for rejection');
        return;
      }
    }

    try {
      setSubmittingReview(true);
      const reviewPayload: JobsheetReviewData = {
        reviewer_id: currentUser.emp_id,
        status: reviewData.status,
        comment: reviewData.comment || '', // Send empty string if no comment for APPROVED
      };

      const result = await jobsheetService.reviewJobsheet(jobsheet.id!, reviewPayload);

      if (result.success) {
        Alert.alert(
          'Success',
          `Jobsheet ${reviewData.status.toLowerCase()} successfully`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowReviewModal(false);
                onReviewComplete();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
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

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.DRAFT;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading jobsheet details...</Text>
      </View>
    );
  }

  if (!jobsheet) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Jobsheet not found</Text>
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerCard}>
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.jobsheetTitle}>{jobsheet.job_sheet_no}</Text>
          <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(jobsheet.status) }]}>
            {jobsheet.status}
          </Text>
        </View>
      </View>

      {/* Company Header */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>COMPANY DETAILS</Text>
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Company Name</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value={jobsheet.company_name}
              editable={false}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value={formatDate(jobsheet.date)}
              editable={false}
            />
          </View>
        </View>
        <View style={styles.fullInput}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.readOnly]}
            value={jobsheet.company_address}
            editable={false}
            multiline
          />
        </View>
      </View>

      {/* Engineer Details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>ENGINEER DETAILS</Text>
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Engineer Name</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value={jobsheet.engineer_name}
              editable={false}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Engineer Code</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value={jobsheet.engineer_code}
              editable={false}
            />
          </View>
        </View>
      </View>

      {/* Customer Details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>CUSTOMER DETAILS</Text>
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Customer Name</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value={jobsheet.customer_name}
              editable={false}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value={jobsheet.customer_phone}
              editable={false}
            />
          </View>
        </View>
        <View style={styles.fullInput}>
          <Text style={styles.label}>Reference</Text>
          <TextInput
            style={[styles.input, styles.readOnly]}
            value={jobsheet.customer_reference || ''}
            editable={false}
          />
        </View>
        <View style={styles.fullInput}>
          <Text style={styles.label}>Location/Address</Text>
          <TextInput
            style={[styles.input, styles.readOnly, styles.textArea]}
            value={jobsheet.customer_location}
            editable={false}
            multiline
            numberOfLines={2}
          />
        </View>
      </View>

      {/* Service Details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>SERVICE DETAILS</Text>
        <View style={styles.fullInput}>
          <Text style={styles.label}>Service Type</Text>
          <TextInput
            style={[styles.input, styles.readOnly]}
            value={jobsheet.service_type}
            editable={false}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Service Date</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value={formatDate(jobsheet.service_date)}
              editable={false}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Time Range</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value={`${jobsheet.service_time_start} - ${jobsheet.service_time_end}`}
              editable={false}
            />
          </View>
        </View>
      </View>

      {/* Issue & Solution */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>ISSUE DESCRIPTION</Text>
        <TextInput
          style={[styles.input, styles.readOnly, styles.textArea]}
          value={jobsheet.issue_description}
          editable={false}
          multiline
          numberOfLines={3}
        />

        <Text style={[styles.sectionTitle, styles.marginTop]}>SOLUTION PROVIDED</Text>
        <TextInput
          style={[styles.input, styles.readOnly, styles.textArea]}
          value={jobsheet.solution_provided}
          editable={false}
          multiline
          numberOfLines={3}
        />

        {jobsheet.customer_comment && (
          <>
            <Text style={[styles.sectionTitle, styles.marginTop]}>CUSTOMER COMMENT</Text>
            <TextInput
              style={[styles.input, styles.readOnly, styles.textArea]}
              value={jobsheet.customer_comment}
              editable={false}
              multiline
              numberOfLines={2}
            />
          </>
        )}
      </View>

      {/* Parts Used */}
      {jobsheet.parts_used && jobsheet.parts_used.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PARTS USED / RETURNED</Text>
          <ScrollView style={styles.partsList} showsVerticalScrollIndicator={false}>
            {jobsheet.parts_used.map((part, index) => (
              <View key={index} style={styles.partRow}>
                <View style={styles.partInfo}>
                  <Text style={styles.partName}>{part.material_name}</Text>
                  <Text style={styles.partDetails}>
                    Model: {part.model_no} | Serial: {part.serial_no} | Qty: {part.quantity}
                  </Text>
                  <Text style={styles.partDetails}>
                    Buyback: {part.buyback ? 'Yes' : 'No'} | Price: ₹{part.price}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Working Details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>WORKING DETAILS</Text>
        <View style={styles.row}>
          <View style={styles.thirdInput}>
            <Text style={styles.label}>Working Hours</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value={jobsheet.working_hours?.toString()}
              editable={false}
            />
          </View>
          <View style={styles.thirdInput}>
            <Text style={styles.label}>Minutes</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value={jobsheet.working_minutes?.toString()}
              editable={false}
            />
          </View>
          <View style={styles.thirdInput}>
            <Text style={styles.label}>Transport (KM)</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value={jobsheet.transportation_km?.toString()}
              editable={false}
            />
          </View>
        </View>
      </View>

      {/* Review Section - Only show if status is SUBMITTED */}
      {jobsheet.status === 'SUBMITTED' && currentUser && (
        <View style={styles.reviewCard}>
          <TouchableOpacity
            onPress={() => setShowReviewModal(true)}
            style={styles.reviewButton}
          >
            <Text style={styles.reviewButtonText}>Review Jobsheet</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Review History - Show if jobsheet has been reviewed */}
      {jobsheet.review && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>REVIEW HISTORY</Text>
          <View style={styles.reviewHistory}>
            <Text style={styles.reviewLabel}>Status:</Text>
            <Text style={[styles.reviewValue, { color: getStatusColor(jobsheet.review.status) }]}>
              {jobsheet.review.status}
            </Text>

            <Text style={styles.reviewLabel}>Reviewed By:</Text>
            <Text style={styles.reviewValue}>
              {jobsheet.review.reviewedBy?.name} ({jobsheet.review.reviewedBy?.empId})
            </Text>

            <Text style={styles.reviewLabel}>Review Date:</Text>
            <Text style={styles.reviewValue}>
              {jobsheet.review.reviewDate ? formatDate(jobsheet.review.reviewDate) : 'N/A'}
            </Text>

            <Text style={styles.reviewLabel}>Comments:</Text>
            <Text style={styles.reviewValue}>{jobsheet.review.comment || 'No comments'}</Text>
          </View>
        </View>
      )}

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Review Jobsheet</Text>

            <View style={styles.reviewForm}>
              <Text style={styles.inputLabel}>Review Status</Text>
              <View style={styles.statusOptions}>
                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    reviewData.status === 'APPROVED' && styles.statusOptionSelected
                  ]}
                  onPress={() => setReviewData(prev => ({ ...prev, status: 'APPROVED' }))}
                >
                  <Text style={[
                    styles.statusOptionText,
                    reviewData.status === 'APPROVED' && styles.statusOptionTextSelected
                  ]}>
                    ✅ APPROVE
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    reviewData.status === 'REJECTED' && styles.statusOptionSelected
                  ]}
                  onPress={() => setReviewData(prev => ({ ...prev, status: 'REJECTED' }))}
                >
                  <Text style={[
                    styles.statusOptionText,
                    reviewData.status === 'REJECTED' && styles.statusOptionTextSelected
                  ]}>
                    ❌ REJECT
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Review Comment</Text>
              <TextInput
                style={[styles.input, styles.textArea, styles.reviewInput]}
                value={reviewData.comment}
                onChangeText={(text) => setReviewData(prev => ({ ...prev, comment: text }))}
                placeholder="Provide your review comments..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowReviewModal(false)}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReviewSubmit}
                disabled={submittingReview}
                style={[styles.modalButton, styles.saveButton]}
              >
                {submittingReview ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Submit Review</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const JobsheetReviewWithTabs = () => {
  const [activeView, setActiveView] = useState('review'); // 'review' or 'detail' or 'history'
  const [selectedJobsheet, setSelectedJobsheet] = useState<JobsheetReviewListItem | null>(null);

  const handleJobsheetPress = (jobsheet: JobsheetReviewListItem) => {
    setSelectedJobsheet(jobsheet);
    setActiveView('detail');
  };

  const handleBackPress = () => {
    setActiveView('review');
    setSelectedJobsheet(null);
  };

  const handleReviewComplete = () => {
    setActiveView('review');
    setSelectedJobsheet(null);
  };

  return (
    <LinearGradient
      colors={['#ec407a', '#641b9a']}
      style={styles.container}
    >
      {/* Main Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.mainTitle}>JOB SHEET REVIEW</Text>
        <Text style={styles.subtitle}>Team Leader Dashboard</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeView === 'review' && styles.activeTab]}
          onPress={() => setActiveView('review')}
        >
          <Text style={[styles.tabText, activeView === 'review' && styles.activeTabText]}>
            Review
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeView === 'history' && styles.activeTab]}
          onPress={() => setActiveView('history')}
        >
          <Text style={[styles.tabText, activeView === 'history' && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {activeView === 'review' ? (
        <JobsheetReviewList onJobsheetPress={handleJobsheetPress} />
      ) : activeView === 'detail' ? (
        <JobsheetDetailReview
          jobsheetId={selectedJobsheet?.id || ''}
          onBackPress={handleBackPress}
          onReviewComplete={handleReviewComplete}
        />
      ) : (
        <JobsheetHistoryScreen />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingTop: 80,
  },
  titleContainer: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 25,
    paddingVertical: 40,
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Filters and List styles
  filtersCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  listCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  headerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  jobsheetTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  thirdInput: {
    width: '31%',
  },
  fullInput: {
    width: '100%',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
  },
  readOnly: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  clearButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  refreshButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  searchButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  searchButtonText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
  },
  downloadContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  downloadTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  downloadButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  downloadButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  excelButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  pdfButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Jobsheet cards
  jobsheetCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobSheetNo: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  engineerName: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    textAlign: 'center',
    minWidth: 80,
  },
  cardContent: {
    gap: 6,
  },
  customerName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  customerLocation: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  serviceDate: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  reviewDate: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  // Card styles
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  marginTop: {
    marginTop: 16,
  },
  // Parts styles
  partsList: {
    maxHeight: 200,
  },
  partRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  partInfo: {
    flex: 1,
  },
  partName: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  partDetails: {
    color: '#374151',
    fontSize: 12,
  },
  // Empty state
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
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
  // Review styles
  reviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  reviewButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  reviewHistory: {
    gap: 8,
  },
  reviewLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewValue: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  reviewForm: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  statusOptionSelected: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  statusOptionTextSelected: {
    color: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    backgroundColor: '#A855F7',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reviewInput: {
    color: '#000000',
  },
});

export default JobsheetReviewWithTabs;