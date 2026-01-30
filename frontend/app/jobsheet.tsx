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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import jobsheetService, { JobsheetData } from './services/jobsheetService';

const { width } = Dimensions.get('window');

// Service types for dropdown
const SERVICE_TYPES = [
  "Warranty",
  "On Call",
  "New",
  "AMC",
  "Delivery"
];

// Content-only components without LinearGradient wrapper and ScrollView
const JobsheetFormContent = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isHardwareEmployee, setIsHardwareEmployee] = useState(false);

  // Form data state
  const [formData, setFormData] = useState<Partial<JobsheetData>>({
    // Header (auto-filled)
    company_name: "VIENSTEREOPTIC",
    company_address: "VIENSTEREOPTIC Office Address",
    date: new Date().toISOString().split('T')[0],

    // Customer Details
    customer_name: '',
    customer_phone: '',
    customer_reference: '',
    customer_location: '',

    // Service Details
    service_type: 'Warranty',
    service_date: new Date().toISOString().split('T')[0],
    service_time_start: '09:00',
    service_time_end: '17:00',

    // Issue & Solution
    issue_description: '',
    solution_provided: '',
    customer_comment: '',

    // Parts Used
    parts_used: [],

    // Working Details
    working_hours: 8,
    working_minutes: 0,
    transportation_km: 0,
  });

  // UI state
  const [showServiceDatePicker, setShowServiceDatePicker] = useState(false);
  const [tempServiceDate, setTempServiceDate] = useState(new Date());

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('user');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setCurrentUser(userData);

          // Check if user is in Hardware department
          const isHardware = userData.department === 'Hardware';
          setIsHardwareEmployee(isHardware);

          // Auto-fill engineer details
          setFormData(prev => ({
            ...prev,
            engineer_id: userData.emp_id,
            engineer_name: userData.name,
            engineer_code: userData.emp_id,
          }));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    loadUserData();
  }, []);

  const handleServiceDateChange = (event, selectedDate) => {
    setShowServiceDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, service_date: formattedDate }));
      setTempServiceDate(selectedDate);
    }
  };

  const handleInputChange = (field: keyof JobsheetData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePartsChange = (parts: any[]) => {
    setFormData(prev => ({ ...prev, parts_used: parts as any[] }));
  };

  const validateForm = (): boolean => {
    const required = [
      'customer_name', 'customer_phone', 'customer_location',
      'service_type', 'service_date', 'service_time_start', 'service_time_end',
      'issue_description', 'solution_provided'
    ];

    for (const field of required) {
      if (!formData[field as keyof JobsheetData]) {
        Alert.alert('Validation Error', `Please fill in ${field.replace('_', ' ')}`);
        return false;
      }
    }

    if (formData.working_hours === undefined || formData.working_hours < 0) {
      Alert.alert('Validation Error', 'Please enter valid working hours');
      return false;
    }

    if (formData.transportation_km === undefined || formData.transportation_km < 0) {
      Alert.alert('Validation Error', 'Please enter valid transportation distance');
      return false;
    }

    return true;
  };

  const handleSaveJobsheet = async () => {
    if (!validateForm()) return;

    // Check if user is in Hardware department
    if (!isHardwareEmployee) {
      Alert.alert('Access Denied', 'Jobsheet functionality is only available for Hardware department employees.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await jobsheetService.createJobsheet(formData as JobsheetData);

      if (result.success) {
        Alert.alert('Success', 'Jobsheet created successfully!');
        // Reset form
        setFormData({
          company_name: "VIENSTEREOPTIC",
          company_address: "VIENSTEREOPTIC Office Address",
          date: new Date().toISOString().split('T')[0],
          customer_name: '',
          customer_phone: '',
          customer_reference: '',
          customer_location: '',
          service_type: 'Warranty',
          service_date: new Date().toISOString().split('T')[0],
          service_time_start: '09:00',
          service_time_end: '17:00',
          issue_description: '',
          solution_provided: '',
          customer_comment: '',
          parts_used: [],
          working_hours: 8,
          working_minutes: 0,
          transportation_km: 0,
          engineer_id: currentUser?.emp_id,
          engineer_name: currentUser?.name,
          engineer_code: currentUser?.emp_id,
        });
      } else {
        Alert.alert('Error', result.error || 'Failed to create jobsheet');
      }
    } catch (error) {
      console.error('Error saving jobsheet:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>JOBSHEET HEADER</Text>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Company Name</Text>
              <TextInput
                style={[styles.input, styles.readOnly]}
                value={formData.company_name}
                editable={false}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={[styles.input, styles.readOnly]}
                value={formData.date}
                editable={false}
              />
            </View>
          </View>
          <View style={styles.fullInput}>
            <Text style={styles.label}>Job Sheet No</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              value="Auto-generated"
              editable={false}
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
                value={formData.engineer_name}
                editable={false}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Engineer Code</Text>
              <TextInput
                style={[styles.input, styles.readOnly]}
                value={formData.engineer_code}
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
              <Text style={styles.label}>Customer Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.customer_name}
                onChangeText={(value) => handleInputChange('customer_name', value)}
                placeholder="Enter customer name"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={formData.customer_phone}
                onChangeText={(value) => handleInputChange('customer_phone', value)}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>
          </View>
          <View style={styles.fullInput}>
            <Text style={styles.label}>Reference</Text>
            <TextInput
              style={styles.input}
              value={formData.customer_reference}
              onChangeText={(value) => handleInputChange('customer_reference', value)}
              placeholder="Enter reference"
            />
          </View>
          <View style={styles.fullInput}>
            <Text style={styles.label}>Location/Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.customer_location}
              onChangeText={(value) => handleInputChange('customer_location', value)}
              placeholder="Enter customer location/address"
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Service Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>SERVICE DETAILS</Text>
          <View style={styles.fullInput}>
            <Text style={styles.label}>Service Type *</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.service_type}
                onValueChange={(value) => handleInputChange('service_type', value)}
                style={styles.picker}
              >
                {SERVICE_TYPES.map(type => (
                  <Picker.Item key={type} label={type} value={type} />
                ))}
              </Picker>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Service Date *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowServiceDatePicker(true)}
              >
                <Text>{formData.service_date}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Time Range *</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  value={formData.service_time_start}
                  onChangeText={(value) => handleInputChange('service_time_start', value)}
                  placeholder="Start"
                />
                <Text style={styles.timeSeparator}>to</Text>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  value={formData.service_time_end}
                  onChangeText={(value) => handleInputChange('service_time_end', value)}
                  placeholder="End"
                />
              </View>
            </View>
          </View>
        </View>

        {showServiceDatePicker && (
          <DateTimePicker
            value={tempServiceDate}
            mode="date"
            display="default"
            onChange={handleServiceDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Issue & Solution */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>ISSUE DESCRIPTION</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.issue_description}
            onChangeText={(value) => handleInputChange('issue_description', value)}
            placeholder="Describe the issue..."
            multiline
            numberOfLines={3}
          />

          <Text style={[styles.sectionTitle, styles.marginTop]}>SOLUTION PROVIDED</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.solution_provided}
            onChangeText={(value) => handleInputChange('solution_provided', value)}
            placeholder="Describe the solution..."
            multiline
            numberOfLines={3}
          />

          <Text style={[styles.sectionTitle, styles.marginTop]}>CUSTOMER COMMENT</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.customer_comment}
            onChangeText={(value) => handleInputChange('customer_comment', value)}
            placeholder="Customer comments (optional)..."
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Parts Used */}
        <PartsTable
          parts={(formData.parts_used as any[]) || []}
          onPartsChange={handlePartsChange}
        />

        {/* Working Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>WORKING DETAILS</Text>
          <View style={styles.row}>
            <View style={styles.thirdInput}>
              <Text style={styles.label}>Working Hours *</Text>
              <TextInput
                style={styles.input}
                value={formData.working_hours?.toString()}
                onChangeText={(value) => handleInputChange('working_hours', parseInt(value) || 0)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.thirdInput}>
              <Text style={styles.label}>Minutes</Text>
              <TextInput
                style={styles.input}
                value={formData.working_minutes?.toString()}
                onChangeText={(value) => handleInputChange('working_minutes', parseInt(value) || 0)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.thirdInput}>
              <Text style={styles.label}>Transport (KM) *</Text>
              <TextInput
                style={styles.input}
                value={formData.transportation_km?.toString()}
                onChangeText={(value) => handleInputChange('transportation_km', parseFloat(value) || 0)}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          onPress={handleSaveJobsheet}
          disabled={isSaving}
          style={[
            styles.saveJobsheetButton,
            isSaving && styles.saveJobsheetButtonDisabled,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveJobsheetButtonText}>Create Jobsheet</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Parts Table Component
const PartsTable = ({ parts, onPartsChange }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPart, setEditingPart] = useState(null);

  const [newPart, setNewPart] = useState({
    material_name: '',
    model_no: '',
    serial_no: '',
    quantity: 1,
    buyback: false,
    price: 0,
  });

  const handleAddPart = () => {
    setEditingPart(null);
    setNewPart({
      material_name: '',
      model_no: '',
      serial_no: '',
      quantity: 1,
      buyback: false,
      price: 0,
    });
    setShowAddModal(true);
  };

  const handleEditPart = (part, index) => {
    setEditingPart(index);
    setNewPart({ ...part });
    setShowAddModal(true);
  };

  const handleDeletePart = (index) => {
    const updatedParts = parts.filter((_, i) => i !== index);
    onPartsChange(updatedParts);
  };

  const handleSavePart = () => {
    if (!newPart.material_name.trim()) {
      Alert.alert('Error', 'Material name is required');
      return;
    }

    let updatedParts;
    if (editingPart !== null) {
      updatedParts = [...parts];
      updatedParts[editingPart] = { ...newPart };
    } else {
      updatedParts = [...parts, { ...newPart }];
    }

    onPartsChange(updatedParts);
    setShowAddModal(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.partsHeader}>
        <Text style={styles.sectionTitle}>PARTS USED / RETURNED</Text>
        <TouchableOpacity
          onPress={handleAddPart}
          style={styles.addPartButton}
        >
          <Text style={styles.addPartButtonText}>+ Add Part</Text>
        </TouchableOpacity>
      </View>

      {parts.length > 0 ? (
        <ScrollView style={styles.partsList} showsVerticalScrollIndicator={false}>
          {parts.map((part, index) => (
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
              <View style={styles.partActions}>
                <TouchableOpacity
                  onPress={() => handleEditPart(part, index)}
                  style={[styles.partActionButton, styles.editButton]}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeletePart(index)}
                  style={[styles.partActionButton, styles.deleteButton]}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.noPartsText}>No parts added yet</Text>
      )}

      {/* Add/Edit Part Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingPart !== null ? 'Edit Part' : 'Add Part'}
            </Text>

            <ScrollView style={styles.modalScrollView}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Material Name *</Text>
                <TextInput
                  style={styles.input}
                  value={newPart.material_name}
                  onChangeText={(text) => setNewPart(prev => ({ ...prev, material_name: text }))}
                  placeholder="Enter material name"
                />
              </View>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Model No</Text>
                  <TextInput
                    style={styles.input}
                    value={newPart.model_no}
                    onChangeText={(text) => setNewPart(prev => ({ ...prev, model_no: text }))}
                    placeholder="Model number"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Serial No</Text>
                  <TextInput
                    style={styles.input}
                    value={newPart.serial_no}
                    onChangeText={(text) => setNewPart(prev => ({ ...prev, serial_no: text }))}
                    placeholder="Serial number"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.thirdInput}>
                  <Text style={styles.inputLabel}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    value={newPart.quantity.toString()}
                    onChangeText={(text) => setNewPart(prev => ({ ...prev, quantity: parseInt(text) || 1 }))}
                    placeholder="1"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.thirdInput}>
                  <Text style={styles.inputLabel}>Price</Text>
                  <TextInput
                    style={styles.input}
                    value={newPart.price.toString()}
                    onChangeText={(text) => setNewPart(prev => ({ ...prev, price: parseFloat(text) || 0 }))}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.thirdInput}>
                  <Text style={styles.inputLabel}>Buyback</Text>
                  <TouchableOpacity
                    style={[styles.checkbox, newPart.buyback && styles.checkboxChecked]}
                    onPress={() => setNewPart(prev => ({ ...prev, buyback: !prev.buyback }))}
                  >
                    <Text style={[styles.checkboxText, newPart.buyback && styles.checkboxTextChecked]}>
                      {newPart.buyback ? '✓' : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSavePart}
                style={[styles.modalButton, styles.saveButton]}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// My Jobsheets Content
const MyJobsheetsContent = () => {
  const [jobsheets, setJobsheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('user');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        setCurrentUser(userData);
        loadJobsheets(userData.emp_id);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setLoading(false);
    }
  };

  const loadJobsheets = async (employeeId: string) => {
    try {
      setLoading(true);
      const result = await jobsheetService.getEmployeeJobsheets(employeeId);
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
      {jobsheets.length > 0 ? (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              Total Jobsheets: {jobsheets.length}
            </Text>
          </View>

          <View style={styles.jobsheetsList}>
            {jobsheets.map((jobsheet: any) => (
              <View key={jobsheet.id} style={styles.jobsheetCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.dateSection}>
                    <Text style={styles.jobsheetNo}>{jobsheet.job_sheet_no}</Text>
                    <Text style={styles.dateText}>{formatDate(jobsheet.date)}</Text>
                  </View>
                  <View style={styles.serviceSection}>
                    <Text style={styles.serviceType}>{jobsheet.service_type}</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <Text style={styles.customerName}>{jobsheet.customer_name}</Text>
                  <Text style={styles.customerLocation}>{jobsheet.customer_location}</Text>
                  <Text style={styles.workingHours}>
                    Working Hours: {jobsheet.working_hours}h {jobsheet.working_minutes}m
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No jobsheets found</Text>
          <Text style={styles.emptySubtext}>
            Your created jobsheets will appear here
          </Text>
        </View>
      )}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const JobsheetWithTabs = () => {
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'myjobsheets'

  return (
    <LinearGradient
      colors={['#ec407a', '#641b9a']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={styles.header}>
          {activeTab === 'create' ? 'Create Jobsheet' : 'My Jobsheets'}
        </Text>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'create' && styles.activeTab]}
            onPress={() => setActiveTab('create')}
          >
            <Text style={[styles.tabText, activeTab === 'create' && styles.activeTabText]}>
              Create
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'myjobsheets' && styles.activeTab]}
            onPress={() => setActiveTab('myjobsheets')}
          >
            <Text style={[styles.tabText, activeTab === 'myjobsheets' && styles.activeTabText]}>
              My Jobsheets
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'create' ? (
          <JobsheetFormContent />
        ) : (
          <MyJobsheetsContent />
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
  formContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
  marginTop: {
    marginTop: 16,
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
  timeInput: {
    flex: 1,
  },
  timeSeparator: {
    color: '#FFFFFF',
    marginHorizontal: 8,
    alignSelf: 'center',
  },
  pickerWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#FFFFFF',
  },
  partsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addPartButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addPartButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  partDetails: {
    color: '#374151',
    fontSize: 12,
  },
  partActions: {
    flexDirection: 'row',
  },
  partActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  editButtonText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  noPartsText: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
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
  modalScrollView: {
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  checkbox: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkboxText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxTextChecked: {
    color: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
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
  saveButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  saveJobsheetButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveJobsheetButtonDisabled: {
    opacity: 0.6,
  },
  saveJobsheetButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
  jobsheetsList: {
    gap: 12,
    paddingHorizontal: 16,
  },
  jobsheetCard: {
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
  jobsheetNo: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 2,
  },
  serviceSection: {
    alignItems: 'flex-end',
  },
  serviceType: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardContent: {
    gap: 8,
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
  workingHours: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
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

export default JobsheetWithTabs;