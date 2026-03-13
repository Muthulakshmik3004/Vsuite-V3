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
  Modal,
  FlatList,
  Image,
  Pressable,
  Linking,
} from 'react-native';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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

const AdminOTRequestsScreen: React.FC = () => {
  const [otRequests, setOtRequests] = useState<OTRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRequest, setSelectedRequest] = useState<OTRequest | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [reviewLoading, setReviewLoading] = useState<boolean>(false);
  
  // Review form state
  const [incentiveAmount, setIncentiveAmount] = useState<string>('');
  const [paidOffDays, setPaidOffDays] = useState<string>('');
  const [adminComment, setAdminComment] = useState<string>('');

  useEffect(() => {
    fetchOTRequests();
  }, []);

  const fetchOTRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/ot/admin/requests/`);
      if (response.data && response.data.ot_requests) {
        setOtRequests(response.data.ot_requests);
      }
    } catch (error) {
      console.error('Error fetching OT requests:', error);
      Alert.alert('Error', 'Failed to fetch OT requests');
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (request: OTRequest) => {
    setSelectedRequest(request);
    setIncentiveAmount('');
    setPaidOffDays('');
    setAdminComment('');
    setModalVisible(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    const isHardware = selectedRequest.department === 'Hardware';
    
    // Validation
    if (isHardware && (!incentiveAmount || parseFloat(incentiveAmount) <= 0)) {
      Alert.alert('Error', 'Please enter a valid incentive amount for Hardware department');
      return;
    }

    if (!isHardware && (!paidOffDays || parseFloat(paidOffDays) <= 0)) {
      Alert.alert('Error', 'Please enter valid paid off days for non-Hardware departments');
      return;
    }

    setReviewLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ot/admin/review/`, {
        request_id: selectedRequest.id,
        status: 'Approved',
        admin_comment: adminComment,
        incentive_amount: isHardware ? parseFloat(incentiveAmount) : 0,
        paid_off_days: !isHardware ? parseFloat(paidOffDays) : 0,
      });

      if (response.data.success) {
        Alert.alert('Success', 'OT request approved successfully');
        setModalVisible(false);
        fetchOTRequests();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to approve OT request');
      }
    } catch (error: any) {
      console.error('Error approving OT request:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to approve OT request');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    if (!adminComment.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    setReviewLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ot/admin/review/`, {
        request_id: selectedRequest.id,
        status: 'Rejected',
        admin_comment: adminComment,
        incentive_amount: 0,
        paid_off_days: 0,
      });

      if (response.data.success) {
        Alert.alert('Success', 'OT request rejected');
        setModalVisible(false);
        fetchOTRequests();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to reject OT request');
      }
    } catch (error: any) {
      console.error('Error rejecting OT request:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to reject OT request');
    } finally {
      setReviewLoading(false);
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

  const viewDocument = async (documentBase64: string, fileName: string = 'document') => {
    try {
      if (!documentBase64) {
        Alert.alert('Error', 'No document available');
        return;
      }

      // Extract base64 data (remove data URI prefix if present)
      let base64Data = documentBase64;
      let mimeType = 'application/octet-stream';
      let extension = 'bin';
      
      if (documentBase64.startsWith('data:')) {
        // Extract MIME type from data URI
        const matches = documentBase64.match(/data:([^;]+);/);
        if (matches && matches[1]) {
          mimeType = matches[1];
          
          // Set extension based on MIME type
          if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
            extension = 'jpg';
          } else if (mimeType === 'image/png') {
            extension = 'png';
          } else if (mimeType === 'image/gif') {
            extension = 'gif';
          } else if (mimeType === 'application/pdf') {
            extension = 'pdf';
          } else if (mimeType === 'application/msword' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            extension = 'doc';
          } else if (mimeType === 'application/vnd.ms-excel' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            extension = 'xls';
          }
        }
        
        // Extract the base64 content after the comma
        const commaIndex = documentBase64.indexOf(',');
        if (commaIndex !== -1) {
          base64Data = documentBase64.substring(commaIndex + 1);
        }
      }

      const tempFileName = `${fileName || 'document'}.${extension}`;
      const tempFileUri = `${FileSystem.cacheDirectory}${tempFileName}`;

      // Write base64 to file
      await FileSystem.writeAsStringAsync(tempFileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        // Open with system viewer
        await Sharing.shareAsync(tempFileUri, {
          mimeType: mimeType,
          dialogTitle: 'Open Document',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      Alert.alert('Error', 'Failed to open document');
    }
  };

  const pendingRequests = otRequests.filter(r => r.status === 'Pending');
  const processedRequests = otRequests.filter(r => r.status !== 'Pending');

  const renderRequestItem = (request: OTRequest) => (
    <View key={request.id} style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View>
          <Text style={styles.employeeName}>{request.employee_name}</Text>
          <Text style={styles.employeeId}>ID: {request.employee_id}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
          <Text style={styles.statusText}>{request.status}</Text>
        </View>
      </View>

      <View style={styles.requestDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Department:</Text>
          <Text style={styles.detailValue}>{request.department}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>OT Date:</Text>
          <Text style={styles.detailValue}>{formatDate(request.ot_date)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>OT Hours:</Text>
          <Text style={styles.detailValue}>{request.ot_hours} hours</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Reason:</Text>
          <Text style={styles.detailValue}>{request.reason || 'N/A'}</Text>
        </View>
        {request.document_file && request.document_file.length > 0 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Document:</Text>
            <TouchableOpacity onPress={() => viewDocument(request.document_file, request.reason)}>
              <Text style={[styles.detailValue, { color: '#4CAF50', textDecorationLine: 'underline' }]}>View Document</Text>
            </TouchableOpacity>
          </View>
        )}
        {request.admin_comment && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Admin Comment:</Text>
            <Text style={styles.detailValue}>{request.admin_comment}</Text>
          </View>
        )}
        {request.status === 'Approved' && request.department === 'Hardware' && (
          <View style={styles.incentiveRow}>
            <Text style={styles.incentiveLabel}>Incentive:</Text>
            <Text style={styles.incentiveValue}>₹{request.incentive_amount}</Text>
          </View>
        )}
        {request.status === 'Approved' && request.department !== 'Hardware' && (
          <View style={styles.incentiveRow}>
            <Text style={styles.incentiveLabel}>Paid Off Days:</Text>
            <Text style={styles.incentiveValue}>{request.paid_off_days} days</Text>
          </View>
        )}
      </View>

      {request.status === 'Pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => openReviewModal(request)}
          >
            <Text style={styles.actionButtonText}>Review</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>OT Requests</Text>
        <Text style={styles.headerSubtitle}>Review and manage overtime requests</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
      ) : (
        <ScrollView style={styles.content}>
          {/* Pending Requests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Pending ({pendingRequests.length})
            </Text>
            {pendingRequests.length === 0 ? (
              <Text style={styles.noDataText}>No pending OT requests</Text>
            ) : (
              pendingRequests.map(renderRequestItem)
            )}
          </View>

          {/* Processed Requests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Processed ({processedRequests.length})
            </Text>
            {processedRequests.length === 0 ? (
              <Text style={styles.noDataText}>No processed OT requests</Text>
            ) : (
              processedRequests.map(renderRequestItem)
            )}
          </View>
        </ScrollView>
      )}

      {/* Review Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Review OT Request</Text>

            {selectedRequest && (
              <>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalInfoText}>
                    Employee: {selectedRequest.employee_name}
                  </Text>
                  <Text style={styles.modalInfoText}>
                    Department: {selectedRequest.department}
                  </Text>
                  <Text style={styles.modalInfoText}>
                    OT Date: {formatDate(selectedRequest.ot_date)}
                  </Text>
                  <Text style={styles.modalInfoText}>
                    Hours: {selectedRequest.ot_hours}
                  </Text>
                  {selectedRequest.reason && (
                    <Text style={styles.modalInfoText}>
                      Reason: {selectedRequest.reason}
                    </Text>
                  )}
                  {selectedRequest.document_file && (
                    <TouchableOpacity onPress={() => viewDocument(selectedRequest.document_file, selectedRequest.reason)}>
                      <Text style={[styles.modalInfoText, { color: '#4CAF50', textDecorationLine: 'underline' }]}>
                        View Document
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {selectedRequest.department === 'Hardware' ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Incentive Amount (₹) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter incentive amount"
                      placeholderTextColor="#999"
                      value={incentiveAmount}
                      onChangeText={setIncentiveAmount}
                      keyboardType="numeric"
                    />
                  </View>
                ) : (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Paid Off Days *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter paid off days"
                      placeholderTextColor="#999"
                      value={paidOffDays}
                      onChangeText={setPaidOffDays}
                      keyboardType="numeric"
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Comment</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter comment (required for rejection)"
                    placeholderTextColor="#999"
                    value={adminComment}
                    onChangeText={setAdminComment}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.rejectButton]}
                    onPress={handleReject}
                    disabled={reviewLoading}
                  >
                    {reviewLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.modalButtonText}>Reject</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.approveButton]}
                    onPress={handleApprove}
                    disabled={reviewLoading}
                  >
                    {reviewLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.modalButtonText}>Approve</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
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
  loader: {
    marginTop: 50,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  noDataText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 20,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  employeeId: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
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
  requestDetails: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  incentiveRow: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  incentiveLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  incentiveValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInfo: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  modalInfoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#999',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  documentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentModalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  documentModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  documentScrollView: {
    maxHeight: 400,
  },
  documentImage: {
    width: '100%',
    height: 400,
  },
  noDocumentText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  closeDocumentButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  closeDocumentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AdminOTRequestsScreen;
