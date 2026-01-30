import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
  Dimensions,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import timesheetService from './services/timesheetService';

const { width } = Dimensions.get('window');

interface EmployeeTimesheet {
  employee_id: string;
  employee_name: string;
  department: string;
  date: string;
  has_timesheet: boolean;
  status?: string;
  activities: any[];
  time_slots: any[];
  reviewer_name?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at?: string;
  updated_at?: string;
}



interface AllEmployeesResponse {
  date: string;
  total_employees: number;
  employees: EmployeeTimesheet[];
}

const AdminTimesheetReview = () => {
  // State for new card-based interface
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [allEmployeesData, setAllEmployeesData] = useState<AllEmployeesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  // Fetch all employees' timesheets on component mount and date change
  useEffect(() => {
    fetchAllEmployeesTimesheets();
  }, [fromDate, toDate]);

  const handleFromDateChange = (event: any, date?: Date) => {
    setShowFromDatePicker(false);
    if (date) {
      const formattedDate = date.toISOString().split('T')[0];
      setFromDate(formattedDate);
      setTempDate(date);
    }
  };

  const handleToDateChange = (event: any, date?: Date) => {
    setShowToDatePicker(false);
    if (date) {
      const formattedDate = date.toISOString().split('T')[0];
      setToDate(formattedDate);
      setTempDate(date);
    }
  };

  const fetchAllEmployeesTimesheets = useCallback(async () => {
    setLoading(true);
    try {
      const result = await timesheetService.getAllEmployeesTimesheets(
        fromDate,
        toDate,
        searchQuery,
        selectedDepartment
      );

      if (result.success && result.data) {
        // Flatten the response structure to match frontend expectations
        const flattenedEmployees: EmployeeTimesheet[] = [];

        if (result.data.employees && Array.isArray(result.data.employees)) {
          result.data.employees.forEach((employee: any) => {
            if (employee.timesheets && Array.isArray(employee.timesheets)) {
              // Create individual timesheet entries for each date
              employee.timesheets.forEach((timesheet: any) => {
                flattenedEmployees.push({
                  employee_id: employee.employee_id,
                  employee_name: employee.employee_name,
                  department: employee.department,
                  date: timesheet.date,
                  has_timesheet: true,
                  status: timesheet.status,
                  activities: timesheet.activities || [],
                  time_slots: timesheet.time_slots || [],
                  reviewer_name: timesheet.reviewer_name,
                  reviewed_at: timesheet.reviewed_at,
                  review_notes: timesheet.review_notes,
                  created_at: timesheet.created_at,
                  updated_at: timesheet.updated_at
                });
              });
            } else if (employee.has_timesheets === false) {
              // For employees with no timesheets, create entries for each date in range
              const startDate = new Date(fromDate);
              const endDate = new Date(toDate);

              for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                flattenedEmployees.push({
                  employee_id: employee.employee_id,
                  employee_name: employee.employee_name,
                  department: employee.department,
                  date: dateStr,
                  has_timesheet: false,
                  status: null,
                  activities: [],
                  time_slots: [
                    {"time": "09-10 AM", "activity": null, "label": "Break"},
                    {"time": "10-11 AM", "activity": null, "label": "Break"},
                    {"time": "11-12 AM", "activity": null, "label": "Break"},
                    {"time": "12-01 PM", "activity": null, "label": "Break"},
                    {"time": "01-02 PM", "activity": null, "label": "Break"},
                    {"time": "02-03 PM", "activity": null, "label": "Break"},
                    {"time": "03-04 PM", "activity": null, "label": "Break"},
                    {"time": "04-05 PM", "activity": null, "label": "Break"},
                    {"time": "05-06 PM", "activity": null, "label": "Break"},
                    {"time": "06-07 PM", "activity": null, "label": "Break"}
                  ],
                  created_at: null,
                  updated_at: null
                });
              }
            }
          });
        }

        // Update the response data with flattened structure
        const flattenedResponse = {
          ...result.data,
          employees: flattenedEmployees
        };

        setAllEmployeesData(flattenedResponse);
      } else {
        Alert.alert('Info', result.message || 'No timesheet data found');
        setAllEmployeesData(null);
      }
    } catch (error) {
      console.error('Error fetching all employees timesheets:', error);
      Alert.alert('Error', 'Failed to fetch timesheet data');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, searchQuery, selectedDepartment]);



  const handleSearch = useCallback(() => {
    fetchAllEmployeesTimesheets();
  }, [fetchAllEmployeesTimesheets]);

  const handleEmployeeCardPress = useCallback((employeeId: string) => {
    setExpandedEmployee(expandedEmployee === employeeId ? null : employeeId);
  }, [expandedEmployee]);



  const handleExportPDF = useCallback(async (employeeId: string, date: string) => {
    try {
      const result = await timesheetService.exportTimesheetPDF(employeeId, date);
      if (result.success && result.data) {
        // Open the download URL in the device's default browser
        await Linking.openURL(result.data);
        Alert.alert('Success', 'PDF opened in browser for download');
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Export PDF error:', error);
      Alert.alert('Error', 'Failed to export PDF');
    }
  }, []);

  const handleExportExcel = useCallback(async (employeeId: string, date: string) => {
    try {
      const result = await timesheetService.exportTimesheetExcel(employeeId, date);
      if (result.success && result.data) {
        // Open the download URL in the device's default browser
        await Linking.openURL(result.data);
        Alert.alert('Success', 'Excel opened in browser for download');
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Export Excel error:', error);
      Alert.alert('Error', 'Failed to export Excel');
    }
  }, []);

  const handleBulkExportExcel = useCallback(async () => {
    try {
      const result = await timesheetService.exportBulkTimesheetExcel(fromDate, toDate, selectedDepartment);
      if (result.success) {
        Alert.alert('Success', 'Bulk Excel download initiated. Check your browser for the downloaded file.');
      } else {
        Alert.alert('Error', result.message || 'Failed to export bulk Excel');
      }
    } catch (error) {
      console.error('Bulk Export Excel error:', error);
      Alert.alert('Error', 'Failed to export bulk Excel');
    }
  }, [fromDate, toDate, selectedDepartment]);



  const renderEmployeeCard = ({ item }: { item: EmployeeTimesheet }) => {
    const isExpanded = expandedEmployee === item.employee_id;
    const hasTimesheet = item.has_timesheet;

    return (
      <TouchableOpacity
        style={styles.employeeCard}
        onPress={() => handleEmployeeCardPress(item.employee_id)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.employeeBasicInfo}>
            <Text style={styles.employeeName}>{item.employee_name}</Text>
            <Text style={styles.employeeId}>ID: {item.employee_id}</Text>
            <Text style={styles.employeeDepartment}>{item.department}</Text>
            <Text style={styles.employeeDate}>
              📅 {new Date(item.date).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </Text>
          </View>

          <View style={styles.cardStatus}>
            {hasTimesheet && item.status && (
              <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
              </View>
            )}
            {!hasTimesheet && (
              <View style={[styles.statusBadge, { backgroundColor: '#6B7280' }]}>
                <Text style={styles.statusText}>NO TIMESHEET</Text>
              </View>
            )}
          </View>
        </View>

        {isExpanded && hasTimesheet && (
          <View style={styles.expandedContent}>
            {/* Review Information */}
            {(item.reviewer_name || item.review_notes) && (
              <View style={styles.reviewInfo}>
                {item.reviewer_name && (
                  <Text style={styles.reviewText}>Reviewed by: {item.reviewer_name}</Text>
                )}
                {item.reviewed_at && (
                  <Text style={styles.reviewText}>Reviewed on: {new Date(item.reviewed_at).toLocaleDateString()}</Text>
                )}
                {item.review_notes && (
                  <Text style={styles.reviewNotes}>Notes: {item.review_notes}</Text>
                )}
              </View>
            )}

            {/* Activities Section */}
            {item.activities && item.activities.length > 0 && (
              <View style={styles.activitiesSection}>
                <Text style={styles.sectionTitle}>Activities</Text>
                {item.activities.map((activity: any, index: number) => (
                  <View key={index} style={styles.activityItem}>
                    <View style={styles.activityHeader}>
                      <View style={styles.activityTimeType}>
                        <Text style={styles.activityTime}>{activity.time}</Text>
                        <View
                          style={[
                            styles.activityBadge,
                            {
                              backgroundColor: getActivityColor(activity.type),
                            },
                          ]}
                        >
                          <Text style={styles.activityBadgeText}>
                            {activity.type.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.activityMeta}>
                        <Text style={styles.activityDuration}>1h</Text>
                        <Text style={styles.activityStatus}>Completed</Text>
                      </View>
                    </View>

                    <View style={styles.activityDetails}>
                      {/* Display activity details based on type */}
                      {activity.type === 'working' && (
                        <>
                          <Text style={styles.activityTitle}>
                            Project: {activity.project || 'N/A'}
                          </Text>
                          <Text style={styles.activityNotes}>
                            Task: {activity.task || 'N/A'}
                          </Text>
                        </>
                      )}

                      {activity.type === 'meeting' && (
                        <>
                          <Text style={styles.activityTitle}>
                            Meeting Type: {activity.meetingType || 'N/A'}
                          </Text>
                          <Text style={styles.activityNotes}>
                            Participants: {activity.participants || 'N/A'}
                          </Text>
                        </>
                      )}

                      {activity.type === 'learning' && (
                        <>
                          <Text style={styles.activityTitle}>
                            Title: {activity.title || 'N/A'}
                          </Text>
                          <Text style={styles.activityNotes}>
                            Notes: {activity.notes || 'N/A'}
                          </Text>
                        </>
                      )}

                      {/* For other activity types, show all available fields */}
                      {activity.type !== 'working' && activity.type !== 'meeting' && activity.type !== 'learning' && (
                        <>
                          {activity.title && (
                            <Text style={styles.activityTitle}>
                              Title: {activity.title}
                            </Text>
                          )}
                          {activity.notes && (
                            <Text style={styles.activityNotes}>
                              Notes: {activity.notes}
                            </Text>
                          )}
                          {activity.project && (
                            <Text style={styles.activityNotes}>
                              Project: {activity.project}
                            </Text>
                          )}
                          {activity.task && (
                            <Text style={styles.activityNotes}>
                              Task: {activity.task}
                            </Text>
                          )}
                          {activity.meetingType && (
                            <Text style={styles.activityNotes}>
                              Meeting Type: {activity.meetingType}
                            </Text>
                          )}
                          {activity.participants && (
                            <Text style={styles.activityNotes}>
                              Participants: {activity.participants}
                            </Text>
                          )}
                        </>
                      )}

                      <View style={styles.activityAdditionalInfo}>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Employee:</Text>
                          <Text style={styles.infoValue}>{item.employee_name}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Date:</Text>
                          <Text style={styles.infoValue}>{item.date}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Time Slot:</Text>
                          <Text style={styles.infoValue}>{activity.time}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Category:</Text>
                          <Text style={styles.infoValue}>{activity.type}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Time Slots Section */}
            {item.time_slots && item.time_slots.length > 0 && (
              <View style={styles.timeSlotsSection}>
                <Text style={styles.sectionTitle}>Time Distribution</Text>
                <View style={styles.timeSlotsGrid}>
                  {item.time_slots.map((slot: any, index: number) => (
                    <View
                      key={index}
                      style={[
                        styles.slotBox,
                        {
                          backgroundColor: getActivityColor(slot.activity),
                        },
                      ]}
                    >
                      <Text style={styles.slotTime}>{slot.time}</Text>
                      <Text style={styles.slotLabel}>{slot.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}



            {/* Export Buttons */}
            <View style={styles.exportButtons}>
              <TouchableOpacity
                style={styles.exportButton}
                onPress={() => handleExportPDF(item.employee_id, item.date)}
              >
                <Text style={styles.exportButtonText}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exportButton}
                onPress={() => handleExportExcel(item.employee_id, item.date)}
              >
                <Text style={styles.exportButtonText}>Excel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isExpanded && !hasTimesheet && (
          <View style={styles.noTimesheetMessage}>
            <Text style={styles.noTimesheetText}>No timesheet submitted for {item.date}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={['#ec407a', '#641b9a']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Admin Timesheet View</Text>

        {/* Filter and Search Controls */}
        <View style={styles.searchCard}>
          <View style={styles.dateRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>From Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  setTempDate(new Date(fromDate));
                  setShowFromDatePicker(true);
                }}
              >
                <Text style={styles.dateButtonText}>{fromDate}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>To Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  setTempDate(new Date(toDate));
                  setShowToDatePicker(true);
                }}
              >
                <Text style={styles.dateButtonText}>{toDate}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Search Employee (Name/ID)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter employee name or ID"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.searchButton, loading && styles.searchButtonDisabled]}
              onPress={handleSearch}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.searchButtonText}>Search</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bulkExportButton]}
              onPress={handleBulkExportExcel}
              disabled={loading}
            >
              <Text style={styles.bulkExportButtonText}>📊 Bulk Excel</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Employee Cards List */}
        {allEmployeesData?.employees && allEmployeesData.employees.length > 0 ? (
          <View style={styles.listContainer}>
            <FlatList
              data={allEmployeesData.employees}
              renderItem={renderEmployeeCard}
              keyExtractor={(item, index) => `${item.employee_id}-${item.date}-${index}`}
              scrollEnabled={false}
            />
          </View>
        ) : loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading timesheets...</Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No timesheet data found</Text>
            <Text style={styles.emptyStateSubtext}>
              Try changing the date or search criteria
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {showFromDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleFromDateChange}
          maximumDate={new Date()}
        />
      )}

      {showToDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleToDateChange}
          maximumDate={new Date()}
        />
      )}
    </LinearGradient>
  );
};

const getActivityColor = (activity: string | null) => {
  if (!activity) return '#E5E7EB';
  if (activity === 'working') return '#3B82F6';
  if (activity === 'meeting') return '#A855F7';
  if (activity === 'learning') return '#22C55E';
  if (activity === 'break') return '#F59E0B';
  if (activity === 'lunch') return '#EF4444';
  if (activity === 'tea') return '#8B5CF6';
  if (activity === 'training') return '#06B6D4';
  if (activity === 'personal') return '#EC4899';
  if (activity === 'other') return '#6B7280';
  return '#9CA3AF'; // Default gray for unknown activity types
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'approved':
      return { backgroundColor: '#10B981' }; // Green
    case 'rejected':
      return { backgroundColor: '#EF4444' }; // Red
    case 'pending':
    default:
      return { backgroundColor: '#F59E0B' }; // Yellow
  }
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
    marginBottom: 24,
  },
  searchCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
  },
  dateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#000',
  },
  searchButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 48, // Ensure minimum height
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'stretch', // Ensure equal height
    gap: 12,
  },
  bulkExportButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 48, // Ensure minimum height
  },
  bulkExportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  summaryColorBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 4,
  },
  summaryCount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  timesheetCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  date: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  activitiesSection: {
    marginBottom: 12,
  },
  activityItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  activityTimeType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  activityTime: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  activityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activityBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  activityDetails: {
    gap: 4,
  },
  activityTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  activityNotes: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  timeSlotsSection: {
    marginTop: 12,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotBox: {
    width: (width - 72) / 5,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotTime: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  slotLabel: {
    color: '#FFFFFF',
    fontSize: 8,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityMeta: {
    alignItems: 'flex-end',
  },
  activityDuration: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityStatus: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '500',
  },
  activityAdditionalInfo: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  exportButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  reviewInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  reviewText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 4,
  },
  reviewNotes: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  approvalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  approvalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#000',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalTextInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
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
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  employeeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  employeeBasicInfo: {
    flex: 1,
  },
  employeeId: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  employeeDepartment: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    marginTop: 2,
  },
  employeeDate: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  cardStatus: {
    alignItems: 'flex-end',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  exportButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  noTimesheetMessage: {
    padding: 20,
    alignItems: 'center',
  },
  noTimesheetText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
  resultsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
  },

});

export default AdminTimesheetReview;
