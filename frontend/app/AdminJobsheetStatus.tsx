import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import jobsheetService, { JobsheetReviewData, JobsheetData } from './services/jobsheetService';
import { JobsheetReviewListItem } from './services/jobsheetService';

const STATUS_COLORS = {
  SUBMITTED: '#F59E0B', // Yellow
  APPROVED: '#10B981',  // Green
  REJECTED: '#714444',  // Red
  DRAFT: '#6B7280',     // Gray
};

const AdminJobsheetStatus = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [jobsheets, setJobsheets] = useState<JobsheetReviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    from_date: '',
    to_date: '',
    employee_id: '',
    status: 'ALL', // Default to ALL for admin view
  });

  // Date picker states
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [tempFromDate, setTempFromDate] = useState(new Date());
  const [tempToDate, setTempToDate] = useState(new Date());

  // Detail modal states
  const [selectedJobsheet, setSelectedJobsheet] = useState<JobsheetData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadJobsheets();
    }
  }, [currentUser, filters]);

  const loadUserData = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('user');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        setCurrentUser(userData);
        
        // Check if user has admin access - support multiple admin role formats
        const isAdmin = userData.role === 'Admin' ||
                       userData.role === 'Administrator' ||
                       userData.role === 'admin' ||
                       userData.role === 'administrator' ||
                       userData.username === 'admin';
        
        if (!isAdmin) {
          setLoading(false);
          Alert.alert(
            'Access Denied',
            'You do not have permission to access the admin job sheet interface. Please use the Team Leader Dashboard to review job sheets.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Navigate back or close the screen
                  // This would depend on your navigation setup
                }
              }
            ]
          );
        }
        // Note: loadJobsheets() will be called by useEffect when currentUser is set
      } else {
        // No user data found
        setLoading(false);
        Alert.alert(
          'Access Denied',
          'You must be logged in to access this page.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back or close the screen
                // This would depend on your navigation setup
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setLoading(false);
      Alert.alert(
        'Error',
        'Failed to load user data. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back or close the screen
              // This would depend on your navigation setup
            }
          }
        ]
      );
    }
  };

  const loadJobsheets = async () => {
    // Check if user has admin access - support multiple admin role formats
    const isAdmin = currentUser && (
      currentUser.role === 'Admin' ||
      currentUser.role === 'Administrator' ||
      currentUser.role === 'admin' ||
      currentUser.role === 'administrator' ||
      currentUser.username === 'admin'
    );

    if (!isAdmin) return;

    try {
      setRefreshing(true);
      // Use username for admin users, emp_id for others
      const userId = currentUser.username || currentUser.emp_id;
      const result = await jobsheetService.getAllJobsheetsAdmin(
        userId,
        filters.from_date || filters.to_date || filters.employee_id || filters.status !== 'ALL'
          ? {
              from_date: filters.from_date || undefined,
              to_date: filters.to_date || undefined,
              employee_id: filters.employee_id || undefined,
              status: filters.status !== 'ALL' ? filters.status : undefined,
            }
          : undefined
      );

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
      setRefreshing(false);
    }
  };

  const handleJobsheetPress = async (jobsheet: JobsheetReviewListItem) => {
    try {
      setLoadingDetail(true);
      setShowDetailModal(true);
      
      // Fetch full jobsheet details
      const result = await jobsheetService.getJobsheetDetail(jobsheet.id);
      
      if (result.success && result.data) {
        setSelectedJobsheet(result.data);
      } else {
        Alert.alert('Error', result.error || 'Failed to load jobsheet details');
        setShowDetailModal(false);
      }
    } catch (error) {
      console.error('Error loading jobsheet details:', error);
      Alert.alert('Error', 'Failed to load jobsheet details');
      setShowDetailModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleBackPress = () => {
    setShowDetailModal(false);
    setSelectedJobsheet(null);
  };

  const handleDownloadPDF = async () => {
    if (!selectedJobsheet || !selectedJobsheet.id) {
      Alert.alert('Error', 'No jobsheet selected');
      return;
    }

    try {
      setDownloadingPDF(true);
      
      // Call the PDF export endpoint
      const result = await jobsheetService.exportJobsheetPDF(selectedJobsheet.id);
      
      if (result.success && result.data) {
        // Save the PDF blob to a file
        const fileName = `jobsheet_${selectedJobsheet.job_sheet_no}.pdf`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(result.data as Blob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const base64 = base64data.split(',')[1];
          
          // Write to file
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          // Share the file
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri);
            Alert.alert('Success', 'PDF downloaded successfully');
          } else {
            Alert.alert('Success', `PDF saved to ${fileUri}`);
          }
        };
      } else {
        Alert.alert('Error', result.error || 'Failed to download PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Error', 'Failed to download PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleFromDateChange = (event, selectedDate) => {
    setShowFromDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setFilters(prev => ({ ...prev, from_date: formattedDate }));
      setTempFromDate(selectedDate);
    }
  };

  const handleToDateChange = (event, selectedDate) => {
    setShowToDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setFilters(prev => ({ ...prev, to_date: formattedDate }));
      setTempToDate(selectedDate);
    }
  };

  const clearFilters = () => {
    setFilters({
      from_date: '',
      to_date: '',
      employee_id: '',
      status: 'ALL',
    });
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

  const getStatusCounts = () => {
    const counts = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      TOTAL: 0
    };

    jobsheets.forEach(jobsheet => {
      const status = jobsheet.status.toUpperCase();
      if (status === 'SUBMITTED') counts.PENDING++;
      else if (status === 'APPROVED') counts.APPROVED++;
      else if (status === 'REJECTED') counts.REJECTED++;
      counts.TOTAL++;
    });

    return counts;
  };

  if (loading) {
    return (
      <LinearGradient colors={['#ec407a', '#641b9a']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading jobsheets...</Text>
        </View>
      </LinearGradient>
    );
  }

  const statusCounts = getStatusCounts();

  return (
    <LinearGradient colors={['#ec407a', '#641b9a']} style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Page Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.pageTitle}>Jobsheet</Text>
          <Text style={styles.pageSubtitle}>View All Jobsheets</Text>
        </View>

        {/* Status Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: '#d6d4d4' }]}>
            <Text style={styles.summaryTitle}>Total</Text>
            <Text style={styles.summaryValue}>{statusCounts.TOTAL}</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: 'rgba(245, 158, 11, 0.25)' }]}>
            <Text style={styles.summaryTitle}>Pending</Text>
            <Text style={styles.summaryValue}>{statusCounts.PENDING}</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: 'rgba(16, 185, 129, 0.25)' }]}>
            <Text style={styles.summaryTitle}>Approved</Text>
            <Text style={styles.summaryValue}>{statusCounts.APPROVED}</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: 'rgba(239, 68, 68, 0.25)' }]}>
            <Text style={styles.summaryTitle}>Rejected</Text>
            <Text style={styles.summaryValue}>{statusCounts.REJECTED}</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersCard}>
          <Text style={styles.sectionTitle}>FILTERS</Text>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>From Date</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowFromDatePicker(true)}
              >
                <Text style={styles.inputText}>{filters.from_date || 'Select date'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>To Date</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowToDatePicker(true)}
              >
                <Text style={styles.inputText}>{filters.to_date || 'Select date'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fullInput}>
            <Text style={styles.label}>Employee ID</Text>
            <TextInput
              style={styles.input}
              value={filters.employee_id}
              onChangeText={(value) => setFilters(prev => ({ ...prev, employee_id: value }))}
              placeholder="Filter by employee ID"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>

          <View style={styles.filterButtons}>
            <TouchableOpacity
              onPress={clearFilters}
              style={[styles.filterButton, styles.clearButton]}
            >
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={loadJobsheets}
              disabled={refreshing}
              style={[styles.filterButton, styles.refreshButton]}
            >
              {refreshing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.refreshButtonText}>Refresh</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {showFromDatePicker && (
          <DateTimePicker
            value={tempFromDate}
            mode="date"
            display="default"
            onChange={handleFromDateChange}
            maximumDate={new Date()}
          />
        )}

        {showToDatePicker && (
          <DateTimePicker
            value={tempToDate}
            mode="date"
            display="default"
            onChange={handleToDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Jobsheets List */}
        <View style={styles.listCard}>
          <Text style={styles.sectionTitle}>
            ALL JOBSHEETS ({jobsheets.length})
          </Text>

          {jobsheets.length > 0 ? (
            jobsheets.map((jobsheet) => (
              <TouchableOpacity
                key={jobsheet.id}
                style={styles.jobsheetCard}
                onPress={() => handleJobsheetPress(jobsheet)}
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
                  <Text style={styles.customerLocation}>📍 {jobsheet.customer_location}</Text>
                  <Text style={styles.serviceDate}>
                    📅 Service Date: {formatDate(jobsheet.service_date)}
                  </Text>
                  <Text style={styles.viewDetailsText}>Tap to view full details →</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No jobsheets found</Text>
              <Text style={styles.emptySubtext}>
                No jobsheets match your filters
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Full Detail Modal for Admin View */}
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Job Sheet Details</Text>
              <TouchableOpacity onPress={handleBackPress} style={styles.closeIconButton}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingDetail ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#ec407a" />
                <Text style={styles.modalLoadingText}>Loading details...</Text>
              </View>
            ) : selectedJobsheet ? (
              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                {/* Company Header */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>COMPANY DETAILS</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Company Name:</Text>
                    <Text style={styles.detailValue}>{selectedJobsheet.company_name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Address:</Text>
                    <Text style={styles.detailValue}>{selectedJobsheet.company_address}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Job Sheet No:</Text>
                    <Text style={styles.detailValue}>{selectedJobsheet.job_sheet_no}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedJobsheet.date)}</Text>
                  </View>
                </View>

                {/* Engineer Details */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>ENGINEER DETAILS</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Engineer Name:</Text>
                    <Text style={styles.detailValue}>{selectedJobsheet.engineer_name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Engineer Code:</Text>
                    <Text style={styles.detailValue}>{selectedJobsheet.engineer_code}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Engineer ID:</Text>
                    <Text style={styles.detailValue}>{selectedJobsheet.engineer_id}</Text>
                  </View>
                </View>

                {/* Customer Details */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>CUSTOMER DETAILS</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Customer Name:</Text>
                    <Text style={styles.detailValue}>{selectedJobsheet.customer_name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone:</Text>
                    <Text style={styles.detailValue}>{selectedJobsheet.customer_phone}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Location:</Text>
                    <Text style={styles.detailValue}>{selectedJobsheet.customer_location}</Text>
                  </View>
                  {selectedJobsheet.customer_reference && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Reference:</Text>
                      <Text style={styles.detailValue}>{selectedJobsheet.customer_reference}</Text>
                    </View>
                  )}
                </View>

                {/* Service Details */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>SERVICE DETAILS</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Service Type:</Text>
                    <Text style={styles.detailValue}>{selectedJobsheet.service_type}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Service Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedJobsheet.service_date)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Service Time:</Text>
                    <Text style={styles.detailValue}>
                      {selectedJobsheet.service_time_start} - {selectedJobsheet.service_time_end}
                    </Text>
                  </View>
                </View>

                {/* Issue & Solution */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>ISSUE & SOLUTION</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Issue Description:</Text>
                    <Text style={styles.detailValue}>{selectedJobsheet.issue_description}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Solution Provided:</Text>
                    <Text style={styles.detailValue}>{selectedJobsheet.solution_provided}</Text>
                  </View>
                  {selectedJobsheet.customer_comment && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Customer Comment:</Text>
                      <Text style={styles.detailValue}>{selectedJobsheet.customer_comment}</Text>
                    </View>
                  )}
                </View>

                {/* Parts Used */}
                {selectedJobsheet.parts_used && selectedJobsheet.parts_used.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>PARTS USED</Text>
                    {selectedJobsheet.parts_used.map((part, index) => (
                      <View key={index} style={styles.partCard}>
                        <Text style={styles.partText}>
                          {part.material_name} - {part.model_no}
                        </Text>
                        <Text style={styles.partText}>
                          Serial: {part.serial_no} | Qty: {part.quantity}
                        </Text>
                        {part.price && (
                          <Text style={styles.partText}>Price: ₹{part.price}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Working Details */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>WORKING DETAILS</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Working Time:</Text>
                    <Text style={styles.detailValue}>
                      {selectedJobsheet.working_hours}h {selectedJobsheet.working_minutes}m
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Transportation:</Text>
                    <Text style={styles.detailValue}>{selectedJobsheet.transportation_km} km</Text>
                  </View>
                </View>

                {/* Office Use (if available) */}
                {(selectedJobsheet.bill_no || selectedJobsheet.manpower_charges) && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>OFFICE USE</Text>
                    {selectedJobsheet.bill_no && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Bill No:</Text>
                        <Text style={styles.detailValue}>{selectedJobsheet.bill_no}</Text>
                      </View>
                    )}
                    {selectedJobsheet.manpower_charges && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Manpower Charges:</Text>
                        <Text style={styles.detailValue}>₹{selectedJobsheet.manpower_charges}</Text>
                      </View>
                    )}
                    {selectedJobsheet.petrol && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Petrol:</Text>
                        <Text style={styles.detailValue}>₹{selectedJobsheet.petrol}</Text>
                      </View>
                    )}
                    {selectedJobsheet.food_tea && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Food & Tea:</Text>
                        <Text style={styles.detailValue}>₹{selectedJobsheet.food_tea}</Text>
                      </View>
                    )}
                    {selectedJobsheet.profit && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Profit:</Text>
                        <Text style={styles.detailValue}>₹{selectedJobsheet.profit}</Text>
                      </View>
                    )}
                    {selectedJobsheet.net_profit && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Net Profit:</Text>
                        <Text style={styles.detailValue}>₹{selectedJobsheet.net_profit}</Text>
                      </View>
                    )}
                    {selectedJobsheet.incentive_percentage && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Incentive %:</Text>
                        <Text style={styles.detailValue}>{selectedJobsheet.incentive_percentage}%</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Status & Review */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>STATUS & REVIEW</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={[styles.detailValue, { color: getStatusColor(selectedJobsheet.status) }]}>
                      {selectedJobsheet.status}
                    </Text>
                  </View>

                  {selectedJobsheet.review && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Review Status:</Text>
                        <Text style={[styles.detailValue, { color: getStatusColor(selectedJobsheet.review.status) }]}>
                          {selectedJobsheet.review.status}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Reviewed By:</Text>
                        <Text style={styles.detailValue}>
                          {selectedJobsheet.review.reviewedBy?.name} ({selectedJobsheet.review.reviewedBy?.empId})
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Review Date:</Text>
                        <Text style={styles.detailValue}>
                          {selectedJobsheet.review.reviewDate ? formatDate(selectedJobsheet.review.reviewDate) : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Review Comments:</Text>
                        <Text style={styles.detailValue}>{selectedJobsheet.review.comment || 'No comments'}</Text>
                      </View>
                    </>
                  )}
                </View>
              </ScrollView>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={handleDownloadPDF}
                disabled={downloadingPDF}
                style={[styles.modalButton, styles.downloadButton]}
              >
                {downloadingPDF ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.downloadButtonText}>📥 Download PDF</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleBackPress}
                style={[styles.modalButton, styles.closeButton]}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  summaryCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  summaryTitle: {
    color: '#110f0f',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryValue: {
    color: '#000000',
    fontSize: 28,
    fontWeight: 'bold',
  },
  filtersCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  listCard: {
    backgroundColor: 'rgba(201, 187, 187, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
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
    marginBottom: 16,
  },
  halfInput: {
    width: '48%',
  },
  fullInput: {
    width: '100%',
    marginBottom: 16,
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
  inputText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  readOnly: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  jobsheetCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    textAlign: 'center',
    minWidth: 90,
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
    fontSize: 13,
  },
  viewDetailsText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '95%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeIconButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  modalLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  modalScrollView: {
    maxHeight: 500,
  },
  detailSection: {
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ec407a',
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#ec407a',
    paddingBottom: 8,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  partCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ec407a',
  },
  partText: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginVertical: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  downloadButton: {
    backgroundColor: '#10B981',
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    backgroundColor: '#6B7280',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AdminJobsheetStatus;
