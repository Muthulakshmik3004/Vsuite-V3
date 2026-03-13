import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import API_BASE_URL from '../config';

interface OTRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  ot_date: string;
  ot_hours: number;
  reason: string;
  document_file: string;
  status: string;
  admin_comment: string;
  incentive_amount: number;
  paid_off_days: number;
  created_at: string;
  reviewed_at: string;
}

const OTRequestScreen: React.FC = () => {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState<string>('');
  const [employeeName, setEmployeeName] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [otDate, setOtDate] = useState<string>('');
  const [otHours, setOtHours] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [documentUri, setDocumentUri] = useState<string>('');
  const [documentName, setDocumentName] = useState<string>('');
  const [documentMimeType, setDocumentMimeType] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [otHistory, setOtHistory] = useState<OTRequest[]>([]);

  useEffect(() => {
    // Set current date as default OT date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    setOtDate(dateStr);
    
    loadEmployeeData();
  }, []);

  const loadEmployeeData = async () => {
    try {
      // Get user data from AsyncStorage (same as other pages)
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        setEmployeeId(user.emp_id || '');
        setEmployeeName(user.name || '');
        setDepartment(user.department || '');
        
        // Load OT history
        fetchOTHistory(user.emp_id || '');
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
    }
  };

  const fetchOTHistory = async (empId: string) => {
    if (!empId) return;
    
    setHistoryLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/ot/employee/${empId}`);
      if (response.data && response.data.ot_requests) {
        // Get current month
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const currentMonthStr = `${year}-${month}`;
        
        // Filter to show only current month's requests
        const filteredHistory = response.data.ot_requests.filter((ot: OTRequest) => {
          return ot.ot_date && ot.ot_date.startsWith(currentMonthStr);
        });
        setOtHistory(filteredHistory);
      }
    } catch (error) {
      console.error('Error fetching OT history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getCurrentMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const pickDocument = async () => {
    try {
      // Show options to choose between image or document
      Alert.alert(
        'Upload Document',
        'Choose document type',
        [
          {
            text: 'Image (Photo)',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.5,
              });

              if (!result.canceled && result.assets && result.assets[0]) {
                const asset = result.assets[0];
                setDocumentUri(asset.uri);
                const fileName = asset.uri.split('/').pop() || 'image';
                setDocumentName(fileName);
                setDocumentMimeType(asset.type || 'image');
              }
            }
          },
          {
            text: 'Document (PDF, Word, Excel)',
            onPress: async () => {
              const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
                copyToCacheDirectory: true,
              });

              if (!result.canceled && result.assets && result.assets[0]) {
                const asset = result.assets[0];
                setDocumentUri(asset.uri);
                setDocumentName(asset.name);
                // Set mime type based on file extension
                let mimeType = 'application/octet-stream';
                if (asset.name.endsWith('.pdf')) mimeType = 'application/pdf';
                else if (asset.name.endsWith('.doc')) mimeType = 'application/msword';
                else if (asset.name.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                else if (asset.name.endsWith('.xls')) mimeType = 'application/vnd.ms-excel';
                else if (asset.name.endsWith('.xlsx')) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                setDocumentMimeType(mimeType);
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const submitOTRequest = async () => {
    // Validation
    if (!otDate || !otHours) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    // Either document or reason is required
    if (!documentUri && !documentName && !reason.trim()) {
      Alert.alert('Error', 'Please either upload a document (Image, PDF, Word, Excel) or provide a reason');
      return;
    }

    const hours = parseFloat(otHours);
    if (isNaN(hours) || hours <= 0) {
      Alert.alert('Error', 'Please enter valid OT hours');
      return;
    }

    setLoading(true);
    try {
      let documentBase64 = '';
      
      // Only convert document to base64 if uploaded
      if (documentUri) {
        const response = await fetch(documentUri);
        const blob = await response.blob();
        const reader = new FileReader();
        documentBase64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      const docResponse = await axios.post(`${API_BASE_URL}/api/ot/request/`, {
        employee_id: employeeId,
        ot_date: otDate,
        ot_hours: hours,
        reason: reason || (documentName || ''),
        document_file: documentBase64,
      });

      if (docResponse.data.success) {
        Alert.alert('Success', 'OT request submitted successfully');
        // Clear form
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        setOtDate(`${year}-${month}-${day}`);
        setOtHours('');
        setReason('');
        setDocumentUri('');
        setDocumentName('');
        setDocumentMimeType('');
        // Refresh history
        fetchOTHistory(employeeId);
      } else {
        Alert.alert('Error', docResponse.data.error || 'Failed to submit OT request');
      }
    } catch (error: any) {
      console.error('Error submitting OT request:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit OT request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return '#4CAF50';
      case 'Rejected':
        return '#f44336';
      default:
        return '#FF9800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch {
      return dateString;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Overtime Request</Text>
        <Text style={styles.headerSubtitle}>
          Submit your overtime requests here
        </Text>
      </View>

      {/* Employee Info */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Employee ID:</Text>
          <Text style={styles.infoValue}>{employeeId}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{employeeName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Department:</Text>
          <Text style={styles.infoValue}>{department}</Text>
        </View>
      </View>

      {/* OT Request Form */}
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>New OT Request</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>OT Date *</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#999"
            value={otDate}
            onChangeText={setOtDate}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>OT Hours *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter hours"
            placeholderTextColor="#999"
            value={otHours}
            onChangeText={setOtHours}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Reason (Optional if document uploaded)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter reason for OT request"
            placeholderTextColor="#999"
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Document Upload (Optional if reason provided) - PDF, Word, Excel, Image</Text>
          <TouchableOpacity
            style={[styles.input, styles.documentInput]}
            onPress={pickDocument}
          >
            {documentUri ? (
              <View style={styles.documentPreview}>
                <Text style={styles.documentText}>📎 {documentName}</Text>
                <Text style={styles.changeText}>Tap to change</Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>Tap to upload Image, PDF, Word, or Excel</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={submitOTRequest}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit OT Request</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* OT History - Current Month */}
      <View style={styles.historyCard}>
        <Text style={styles.sectionTitle}>OT Request History - {getCurrentMonth()}</Text>

        {historyLoading ? (
          <ActivityIndicator size="small" color="#4CAF50" />
        ) : otHistory.length === 0 ? (
          <Text style={styles.noDataText}>No OT requests found</Text>
        ) : (
          otHistory.map((ot, index) => (
            <View key={ot.id || index} style={styles.historyItem}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyDate}>{formatDate(ot.ot_date)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ot.status) }]}>
                  <Text style={styles.statusText}>{ot.status}</Text>
                </View>
              </View>
              <View style={styles.historyDetails}>
                <Text style={styles.historyLabel}>Hours: {ot.ot_hours}</Text>
                <Text style={styles.historyLabel}>Reason: {ot.reason}</Text>
                {ot.admin_comment && (
                  <Text style={styles.historyComment}>
                    Comment: {ot.admin_comment}
                  </Text>
                )}
                {ot.status === 'Approved' && department === 'Hardware' && (
                  <Text style={styles.incentiveText}>
                    Incentive: ₹{ot.incentive_amount}
                  </Text>
                )}
                {ot.status === 'Approved' && department !== 'Hardware' && (
                  <Text style={styles.incentiveText}>
                    Paid Off Days: {ot.paid_off_days}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Note */}
      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Note:</Text>
        <Text style={styles.noteText}>
          • Hardware Department: Monetary incentive will be added to payroll{'\n'}
          • Other Departments: Paid off days will be added to your account{'\n'}
          • Valid for 3 months from approval date
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 5,
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  formCard: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
  },
  documentInput: {
    height: 60,
    justifyContent: 'center',
  },
  documentPreview: {
    alignItems: 'center',
  },
  documentText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  changeText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  placeholderText: {
    fontSize: 14,
    color: '#999',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#a5d6a7',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyCard: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noDataText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 20,
  },
  historyItem: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  historyDetails: {
    marginTop: 5,
  },
  historyLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  historyComment: {
    fontSize: 13,
    color: '#f44336',
    marginTop: 4,
    fontStyle: 'italic',
  },
  incentiveText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 4,
  },
  noteCard: {
    backgroundColor: '#fff3cd',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 20,
  },
});

export default OTRequestScreen;
