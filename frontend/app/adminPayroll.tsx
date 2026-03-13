import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
  Linking,
  RefreshControl,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import payrollService, { PayrollData } from "./services/payrollService";
import employeeService, { Employee } from "./services/employeeService";
import ManageOptionalHolidays from "./ManageOptionalHolidays";
import API_BASE_URL from "../config";
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const AdminPayroll = () => {
  const [loading, setLoading] = useState(false);
  const [payrollList, setPayrollList] = useState<PayrollData[]>([]);
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollData | null>(null);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [showDailyBreakdown, setShowDailyBreakdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [newSalary, setNewSalary] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [activeTab, setActiveTab] = useState<"payroll" | "employees" | "otRequests" | "optionalHolidays">("payroll");
  const [refreshing, setRefreshing] = useState(false);
  const [workModeFilter, setWorkModeFilter] = useState<"All" | "WFO" | "WFH">("All");

  // OT Request states
  const [otRequests, setOtRequests] = useState<any[]>([]);
  const [otLoading, setOtLoading] = useState(false);
  const [selectedOtRequest, setSelectedOtRequest] = useState<any | null>(null);
  const [otModalVisible, setOtModalVisible] = useState(false);
  const [otReviewLoading, setOtReviewLoading] = useState(false);
  const [incentiveAmount, setIncentiveAmount] = useState('');
  const [paidOffDays, setPaidOffDays] = useState('');
  const [adminComment, setAdminComment] = useState('');

  // Get current month as default
  useEffect(() => {
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(month);
  }, []);

  const fetchPayroll = async () => {
    if (!selectedMonth) return;

    setLoading(true);
    try {
      const result = await payrollService.getMonthPayroll(selectedMonth);
      if (result.success && result.employees) {
        setPayrollList(result.employees);
      } else {
        setPayrollList([]);
        if (result.message) {
          Alert.alert("Info", result.message);
        }
      }
    } catch (error) {
      console.error("Error fetching payroll:", error);
      Alert.alert("Error", "Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const result = await employeeService.getAllEmployees();
      if (result.success && result.employees) {
        setEmployeeList(result.employees);
      } else {
        setEmployeeList([]);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      Alert.alert("Error", "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const fetchOtRequests = async () => {
    setOtLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/ot/admin/requests/`);
      if (response.data && response.data.ot_requests) {
        setOtRequests(response.data.ot_requests);
      }
    } catch (error) {
      console.error('Error fetching OT requests:', error);
      Alert.alert('Error', 'Failed to fetch OT requests');
    } finally {
      setOtLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === "payroll") {
      await fetchPayroll();
    } else {
      await fetchEmployees();
    }
    setRefreshing(false);
  };

  const handleGeneratePayroll = async () => {
    if (!selectedMonth) return;

    Alert.alert(
      "Generate Payroll",
      `Are you sure you want to generate payroll for ${selectedMonth}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Generate",
          onPress: async () => {
            setLoading(true);
            try {
              const result = await payrollService.generatePayroll(selectedMonth);
              if (result.success) {
                Alert.alert("Success", "Payroll generated successfully");
                // Auto-fetch payroll after generation
                const payrollResult = await payrollService.getMonthPayroll(selectedMonth);
                if (payrollResult.success && payrollResult.employees) {
                  setPayrollList(payrollResult.employees);
                } else {
                  fetchPayroll();
                }
              } else {
                Alert.alert("Error", result.message || "Failed to generate payroll");
              }
            } catch (error) {
              console.error("Error generating payroll:", error);
              Alert.alert("Error", "Failed to generate payroll");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSendSalarySlips = async () => {
    if (!selectedMonth) return;
    if (payrollList.length === 0) {
      Alert.alert("Info", "Please generate payroll first before sending salary slips.");
      return;
    }

    Alert.alert(
      "Send PDF Salary Slips",
      `Are you sure you want to send professional PDF salary slips with company logo to all ${payrollList.length} employees for ${selectedMonth}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            setLoading(true);
            try {
              const result = await payrollService.sendSalarySlipsEmail(selectedMonth);
              if (result.success) {
                Alert.alert(
                  "Success",
                  `Salary slips sent!\nSent: ${result.data?.sent_count}\nFailed: ${result.data?.failed_count}`
                );
              } else {
                Alert.alert("Error", result.message || "Failed to send salary slips");
              }
            } catch (error) {
              console.error("Error sending salary slips:", error);
              Alert.alert("Error", "Failed to send salary slips");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleExportExcel = async () => {
    if (!selectedMonth) return;
    if (payrollList.length === 0) {
      Alert.alert("Info", "Please generate payroll first before exporting to Excel.");
      return;
    }

    try {
      setLoading(true);
      const result = await payrollService.exportPayrollExcel(selectedMonth);
      if (result.success && result.data) {
        Linking.openURL(result.data);
      } else {
        Alert.alert("Error", result.message || "Failed to generate Excel");
      }
    } catch (error) {
      console.error("Error exporting Excel:", error);
      Alert.alert("Error", "Failed to export Excel file");
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (direction: number) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    let newMonth = month + direction;
    let newYear = year;

    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }

    const newMonthStr = `${newYear}-${String(newMonth).padStart(2, "0")}`;
    setSelectedMonth(newMonthStr);
    setPayrollList([]);
  };

  const handleEmployeePress = (employee: PayrollData) => {
    setSelectedEmployee(employee);
    setShowModal(true);
  };

  const handleEmpPress = (employee: Employee) => {
    setSelectedEmp(employee);
    setNewSalary("");
    setEffectiveFrom(selectedMonth);
    setShowEmpModal(true);
  };

  const handleUpdateSalaryFromList = (employee: PayrollData) => {
    setSelectedEmployee(employee);
    setNewSalary(employee.base_salary.toString());
    setEffectiveFrom(selectedMonth);
    setShowSalaryModal(true);
  };

  const handleUpdateSalary = async () => {
    if (!selectedEmployee || !newSalary || !effectiveFrom) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const result = await payrollService.updateBaseSalary(
        selectedEmployee.employee_id,
        parseFloat(newSalary),
        effectiveFrom
      );
      if (result.success) {
        Alert.alert("Success", "Base salary updated successfully");
        setShowSalaryModal(false);
        setNewSalary("");
        setEffectiveFrom("");
        fetchPayroll();
      } else {
        Alert.alert("Error", result.message || "Failed to update salary");
      }
    } catch (error) {
      console.error("Error updating salary:", error);
      Alert.alert("Error", "Failed to update salary");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmpSalary = async () => {
    if (!selectedEmp || !newSalary || !effectiveFrom) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const result = await payrollService.updateBaseSalary(
        selectedEmp.emp_id,
        parseFloat(newSalary),
        effectiveFrom
      );
      if (result.success) {
        Alert.alert("Success", "Base salary set successfully");
        setShowEmpModal(false);
        setNewSalary("");
        setEffectiveFrom("");
        fetchEmployees();
      } else {
        Alert.alert("Error", result.message || "Failed to set salary");
      }
    } catch (error) {
      console.error("Error setting salary:", error);
      Alert.alert("Error", "Failed to set salary");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (employeeId: string) => {
    try {
      const result = await payrollService.exportPayrollPDF(employeeId, selectedMonth);
      if (result.success && result.data) {
        Linking.openURL(result.data);
      } else {
        Alert.alert("Error", result.message || "Failed to generate PDF");
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      Alert.alert("Error", "Failed to download PDF");
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}`;
  };

  // Calculate deduction based on expected vs actual hours
  const calculateDeduction = () => {
    if (!selectedEmployee || !selectedEmployee.daily_salaries || selectedEmployee.daily_salaries.length === 0) {
      return 0;
    }
    
    const perHourSalary = selectedEmployee.per_hour_salary || (selectedEmployee.per_day_salary / 10);
    let totalExpectedHours = selectedEmployee.daily_salaries.length * 10; // 10 hours expected per day
    let totalActualHours = selectedEmployee.total_work_hours || 0;
    
    const hoursDiff = totalExpectedHours - totalActualHours;
    if (hoursDiff > 0) {
      return hoursDiff * perHourSalary;
    }
    return 0;
  };

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  // OT Request functions
  const openOtReviewModal = (request: any) => {
    setSelectedOtRequest(request);
    setIncentiveAmount('');
    setPaidOffDays('');
    setAdminComment('');
    setOtModalVisible(true);
  };

  const handleApproveOt = async () => {
    if (!selectedOtRequest) return;

    const isHardware = selectedOtRequest.department === 'Hardware';
    
    if (isHardware && (!incentiveAmount || parseFloat(incentiveAmount) <= 0)) {
      Alert.alert('Error', 'Please enter a valid incentive amount for Hardware department');
      return;
    }

    if (!isHardware && (!paidOffDays || parseFloat(paidOffDays) <= 0)) {
      Alert.alert('Error', 'Please enter valid paid off days for non-Hardware departments');
      return;
    }

    setOtReviewLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ot/admin/review/`, {
        request_id: selectedOtRequest.id,
        status: 'Approved',
        admin_comment: adminComment,
        incentive_amount: isHardware ? parseFloat(incentiveAmount) : 0,
        paid_off_days: !isHardware ? parseFloat(paidOffDays) : 0,
      });

      if (response.data.success) {
        Alert.alert('Success', 'OT request approved successfully');
        setOtModalVisible(false);
        fetchOtRequests();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to approve OT request');
      }
    } catch (error: any) {
      console.error('Error approving OT request:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to approve OT request');
    } finally {
      setOtReviewLoading(false);
    }
  };

  const handleRejectOt = async () => {
    if (!selectedOtRequest) return;

    if (!adminComment.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    setOtReviewLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ot/admin/review/`, {
        request_id: selectedOtRequest.id,
        status: 'Rejected',
        admin_comment: adminComment,
        incentive_amount: 0,
        paid_off_days: 0,
      });

      if (response.data.success) {
        Alert.alert('Success', 'OT request rejected');
        setOtModalVisible(false);
        fetchOtRequests();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to reject OT request');
      }
    } catch (error: any) {
      console.error('Error rejecting OT request:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to reject OT request');
    } finally {
      setOtReviewLoading(false);
    }
  };

  const viewOtDocument = async (documentBase64: string, fileName: string = 'document') => {
    try {
      if (!documentBase64) {
        Alert.alert('Error', 'No document available');
        return;
      }

      let base64Data = documentBase64;
      let mimeType = 'application/octet-stream';
      let extension = 'bin';
      
      if (documentBase64.startsWith('data:')) {
        const matches = documentBase64.match(/data:([^;]+);/);
        if (matches && matches[1]) {
          mimeType = matches[1];
          if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') extension = 'jpg';
          else if (mimeType === 'image/png') extension = 'png';
          else if (mimeType === 'application/pdf') extension = 'pdf';
          else if (mimeType.includes('word')) extension = 'doc';
          else if (mimeType.includes('excel') || mimeType.includes('sheet')) extension = 'xls';
        }
        const commaIndex = documentBase64.indexOf(',');
        if (commaIndex !== -1) {
          base64Data = documentBase64.substring(commaIndex + 1);
        }
      }

      const tempFileName = `${fileName || 'document'}.${extension}`;
      const tempFileUri = `${FileSystem.cacheDirectory}${tempFileName}`;

      await FileSystem.writeAsStringAsync(tempFileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
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

  const getOtStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return '#4CAF50';
      case 'Rejected': return '#f44336';
      default: return '#FF9800';
    }
  };

  const formatOtDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch {
      return dateString;
    }
  };

  const renderPayrollItem = ({ item }: { item: PayrollData }) => (
    <View style={styles.employeeCard}>
      <TouchableOpacity 
        style={styles.employeeInfo}
        onPress={() => handleEmployeePress(item)}
      >
        <Text style={styles.employeeName}>{item.employee_name}</Text>
        <Text style={styles.employeeId}>{item.employee_id}</Text>
        <Text style={styles.baseSalaryText}>Base: {formatCurrency(item.base_salary)}</Text>
      </TouchableOpacity>
      <View style={styles.salaryInfo}>
        <Text style={styles.netSalary}>{formatCurrency(item.net_salary)}</Text>
        <Text style={styles.statusText}>{item.status}</Text>
        <TouchableOpacity 
          style={styles.updateSalaryButton}
          onPress={() => handleUpdateSalaryFromList(item)}
        >
          <Text style={styles.updateSalaryButtonText}>Update Salary</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmployeeItem = ({ item }: { item: Employee }) => {
    return (
      <View style={styles.employeeCard}>
        <TouchableOpacity 
          style={styles.employeeInfo}
          onPress={() => handleEmpPress(item)}
        >
          <Text style={styles.employeeName}>{item.name}</Text>
          <Text style={styles.employeeId}>{item.emp_id}</Text>
          <Text style={styles.baseSalaryText}>{item.gmail}</Text>
        </TouchableOpacity>
        <View style={styles.salaryInfo}>
          <TouchableOpacity 
            style={styles.updateSalaryButton}
            onPress={() => handleEmpPress(item)}
          >
            <Text style={styles.updateSalaryButtonText}>Set Salary</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={["#ec407a", "#641b9a"]} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#fff"]} tintColor="#fff" />
      }>
        <Text style={styles.title}>💰 Payroll Management</Text>

        {/* Tab Buttons */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === "payroll" && styles.activeTabButton]}
            onPress={() => setActiveTab("payroll")}
          >
            <Text style={[styles.tabButtonText, activeTab === "payroll" && styles.activeTabButtonText]}>
              Payroll
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === "employees" && styles.activeTabButton]}
            onPress={() => { setActiveTab("employees"); fetchEmployees(); }}
          >
            <Text style={[styles.tabButtonText, activeTab === "employees" && styles.activeTabButtonText]}>
              View Employees
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === "otRequests" && styles.activeTabButton]}
            onPress={() => { setActiveTab("otRequests"); fetchOtRequests(); }}
          >
            <Text style={[styles.tabButtonText, activeTab === "otRequests" && styles.activeTabButtonText]}>
              OT Requests
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === "optionalHolidays" && styles.activeTabButton]}
            onPress={() => setActiveTab("optionalHolidays")}
          >
            <Text style={[styles.tabButtonText, activeTab === "optionalHolidays" && styles.activeTabButtonText]}>
              Manage Holidays
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "payroll" && (
          <>
            {/* Month Selector */}
            <View style={styles.monthSelector}>
              <TouchableOpacity
                style={styles.monthButton}
                onPress={() => handleMonthChange(-1)}
              >
                <Text style={styles.monthButtonText}>◀</Text>
              </TouchableOpacity>

              <Text style={styles.monthText}>{getMonthName(selectedMonth)}</Text>

              <TouchableOpacity
                style={styles.monthButton}
                onPress={() => handleMonthChange(1)}
              >
                <Text style={styles.monthButtonText}>▶</Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.actionButton} onPress={fetchPayroll}>
                <Text style={styles.actionButtonText}>View Payroll</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.generateButton]}
                onPress={handleGeneratePayroll}
              >
                <Text style={styles.actionButtonText}>Generate</Text>
              </TouchableOpacity>
            </View>

            {/* Send Salary Slips Button */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.emailButton]}
                onPress={handleSendSalarySlips}
              >
                <Text style={styles.actionButtonText}>📄 Send PDF Salary Slips to All</Text>
              </TouchableOpacity>
            </View>

            {/* Export Excel Button - Only show when payroll is generated */}
            {payrollList.length > 0 && (
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.excelButton]}
                  onPress={handleExportExcel}
                >
                  <Text style={styles.actionButtonText}>📊 Download Excel</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Work Mode Filter Tabs */}
            {payrollList.length > 0 && (
              <View style={styles.workModeFilterContainer}>
                <Text style={styles.filterLabel}>Filter by Work Mode:</Text>
                <View style={styles.workModeTabs}>
                  <TouchableOpacity
                    style={[styles.workModeTab, workModeFilter === "All" && styles.activeWorkModeTab]}
                    onPress={() => setWorkModeFilter("All")}
                  >
                    <Text style={[styles.workModeTabText, workModeFilter === "All" && styles.activeWorkModeTabText]}>
                      All ({payrollList.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.workModeTab, workModeFilter === "WFO" && styles.activeWorkModeTab]}
                    onPress={() => setWorkModeFilter("WFO")}
                  >
                    <Text style={[styles.workModeTabText, workModeFilter === "WFO" && styles.activeWorkModeTabText]}>
                      WFO ({payrollList.filter(p => p.employment_type === "WFO" || !p.employment_type).length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.workModeTab, workModeFilter === "WFH" && styles.activeWorkModeTab]}
                    onPress={() => setWorkModeFilter("WFH")}
                  >
                    <Text style={[styles.workModeTabText, workModeFilter === "WFH" && styles.activeWorkModeTabText]}>
                      WFH ({payrollList.filter(p => p.employment_type === "WFH").length})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}

        {/* Payroll List */}
        {!loading && activeTab === "payroll" && payrollList.length > 0 && (
          <View style={styles.listContainer}>
            <Text style={styles.listTitle}>
              Employees ({workModeFilter === "All" ? payrollList.length : workModeFilter === "WFO" ? payrollList.filter(p => p.employment_type === "WFO" || !p.employment_type).length : payrollList.filter(p => p.employment_type === "WFH").length})
            </Text>
            <FlatList
              data={workModeFilter === "All" ? payrollList : workModeFilter === "WFO" ? payrollList.filter(p => p.employment_type === "WFO" || !p.employment_type) : payrollList.filter(p => p.employment_type === "WFH")}
              renderItem={renderPayrollItem}
              keyExtractor={(item) => item.employee_id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Employee List */}
        {!loading && activeTab === "employees" && employeeList.length > 0 && (
          <View style={styles.listContainer}>
            <Text style={styles.listTitle}>
              All Employees ({employeeList.length})
            </Text>
            <FlatList
              data={employeeList}
              renderItem={renderEmployeeItem}
              keyExtractor={(item) => item.emp_id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* No Data Message */}
        {!loading && (
          <View style={styles.noDataContainer}>
            {activeTab === "payroll" && payrollList.length === 0 && (
              <>
                <Text style={styles.noDataText}>
                  No payroll data for {getMonthName(selectedMonth)}
                </Text>
                <Text style={styles.noDataSubtext}>
                  Click "Generate" to create payroll
                </Text>
              </>
            )}
            {activeTab === "employees" && employeeList.length === 0 && (
              <>
                <Text style={styles.noDataText}>
                  No employees found
                </Text>
                <Text style={styles.noDataSubtext}>
                  New employees will appear automatically
                </Text>
              </>
            )}
          </View>
        )}

        {/* OT Requests Tab */}
        {activeTab === "otRequests" && (
          <View style={styles.listContainer}>
            <Text style={styles.sectionHeader}>OT Requests</Text>
            
            {otLoading ? (
              <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
            ) : otRequests.length > 0 ? (
              otRequests.map((request) => (
                <View key={request.id} style={styles.otRequestCard}>
                  <View style={styles.otRequestHeader}>
                    <View>
                      <Text style={styles.otEmployeeName}>{request.employee_name}</Text>
                      <Text style={styles.otEmployeeId}>ID: {request.employee_id}</Text>
                    </View>
                    <View style={[styles.otStatusBadge, { backgroundColor: getOtStatusColor(request.status) }]}>
                      <Text style={styles.otStatusText}>{request.status}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.otRequestDetails}>
                    <View style={styles.otDetailRow}>
                      <Text style={styles.otDetailLabel}>Department:</Text>
                      <Text style={styles.otDetailValue}>{request.department}</Text>
                    </View>
                    <View style={styles.otDetailRow}>
                      <Text style={styles.otDetailLabel}>OT Date:</Text>
                      <Text style={styles.otDetailValue}>{formatOtDate(request.ot_date)}</Text>
                    </View>
                    <View style={styles.otDetailRow}>
                      <Text style={styles.otDetailLabel}>OT Hours:</Text>
                      <Text style={styles.otDetailValue}>{request.ot_hours} hours</Text>
                    </View>
                    {request.reason && (
                      <View style={styles.otDetailRow}>
                        <Text style={styles.otDetailLabel}>Reason:</Text>
                        <Text style={styles.otDetailValue}>{request.reason}</Text>
                      </View>
                    )}
                    {request.document_file && request.document_file.length > 0 && (
                      <View style={styles.otDetailRow}>
                        <Text style={styles.otDetailLabel}>Document:</Text>
                        <TouchableOpacity onPress={() => viewOtDocument(request.document_file, request.reason)}>
                          <Text style={[styles.otDetailValue, { color: '#4CAF50', textDecorationLine: 'underline' }]}>View Document</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {request.status === 'Pending' && (
                    <TouchableOpacity 
                      style={styles.otReviewButton}
                      onPress={() => openOtReviewModal(request)}
                    >
                      <Text style={styles.otReviewButtonText}>Review</Text>
                    </TouchableOpacity>
                  )}

                  {request.status === 'Approved' && request.department === 'Hardware' && (
                    <View style={styles.otIncentiveRow}>
                      <Text style={styles.otIncentiveLabel}>Incentive:</Text>
                      <Text style={styles.otIncentiveValue}>₹{request.incentive_amount}</Text>
                    </View>
                  )}
                  {request.status === 'Approved' && request.department !== 'Hardware' && (
                    <View style={styles.otIncentiveRow}>
                      <Text style={styles.otIncentiveLabel}>Paid Off Days:</Text>
                      <Text style={styles.otIncentiveValue}>{request.paid_off_days} days</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No OT requests found</Text>
            )}
          </View>
        )}

        {/* Optional Holidays Tab */}
        {activeTab === "optionalHolidays" && (
          <View style={{flex: 1, minHeight: 400}}>
            <ManageOptionalHolidays />
          </View>
        )}
      </ScrollView>

      {/* Employee Detail Modal */}
      <Modal visible={showModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📋 Payroll Details</Text>

            {selectedEmployee && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Basic Info */}
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, {fontWeight: 'bold', fontSize: 16}]}>{selectedEmployee.employee_name}</Text>
                  <Text style={[styles.detailValue, {color: '#666'}]}>{selectedEmployee.employee_id}</Text>
                </View>

                {/* Salary Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>💰 Salary</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Base Salary</Text>
                    <Text style={styles.detailValue}>{formatCurrency(selectedEmployee.base_salary)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Per Day Salary</Text>
                    <Text style={styles.detailValue}>{formatCurrency(selectedEmployee.per_day_salary)}</Text>
                  </View>
                </View>

                {/* Attendance Details */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>📅 Attendance</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Working Days</Text>
                    <Text style={styles.detailValue}>{selectedEmployee.total_working_days}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Present Days</Text>
                    <Text style={[styles.detailValue, {color: '#ec407a'}]}>{selectedEmployee.present_days}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Paid Off Days</Text>
                    <Text style={styles.detailValue}>{selectedEmployee.paid_off_days}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Leave Days</Text>
                    <Text style={styles.detailValue}>{selectedEmployee.leave_days}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Optional Holidays</Text>
                    <Text style={styles.detailValue}>{selectedEmployee.optional_holiday_days || 0}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fixed Holidays</Text>
                    <Text style={styles.detailValue}>{selectedEmployee.fixed_holiday_days || 0}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Absent Days</Text>
                    <Text style={[styles.detailValue, {color: '#f44336'}]}>{selectedEmployee.absent_days}</Text>
                  </View>
                </View>

                {/* Late & Permissions */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>⏰ Late & Permissions</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Late Days</Text>
                    <Text style={styles.detailValue}>{selectedEmployee.late_days}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Late Deduction (days)</Text>
                    <Text style={[styles.detailValue, {color: '#f44336'}]}>{selectedEmployee.late_deduction_days?.toFixed(2) || 0}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Permission Hours</Text>
                    <Text style={styles.detailValue}>{selectedEmployee.permission_hours || 0}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Permission Deduction</Text>
                    <Text style={[styles.detailValue, {color: '#f44336'}]}>{selectedEmployee.permission_deduction_days?.toFixed(2) || 0} days</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Short Hours Days</Text>
                    <Text style={styles.detailValue}>{selectedEmployee.short_hours_days || 0}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Short Hours Deduction</Text>
                    <Text style={[styles.detailValue, {color: '#f44336'}]}>{selectedEmployee.short_hours_deduction?.toFixed(2) || 0} days ({formatCurrency((selectedEmployee.short_hours_deduction || 0) * selectedEmployee.per_day_salary)})</Text>
                  </View>
                </View>

                {/* Work Hours Details */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>⏱️ Work Hours Details</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Work Hours</Text>
                    <Text style={[styles.detailValue, {color: '#ec407a'}]}>{selectedEmployee.total_work_hours || 0} hrs</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Per Hour Salary</Text>
                    <Text style={styles.detailValue}>{formatCurrency(selectedEmployee.per_hour_salary || selectedEmployee.per_day_salary / 10)}</Text>
                  </View>
                  {selectedEmployee.calculation_method && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Calculation Method</Text>
                      <Text style={[styles.detailValue, {color: '#ec407a'}]}>Work Hours Based</Text>
                    </View>
                  )}
                  {selectedEmployee.office_start_time && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Office Time</Text>
                      <Text style={styles.detailValue}>{selectedEmployee.office_start_time} - {selectedEmployee.office_end_time}</Text>
                    </View>
                  )}
                </View>

                {/* Daily Salary Breakdown - Collapsible */}
                {selectedEmployee && (selectedEmployee.daily_salaries !== undefined || selectedEmployee.total_work_hours !== undefined) && (
                  <View style={styles.detailSection}>
                    {/* Collapsible Button */}
                    <TouchableOpacity 
                      style={styles.collapsibleButton}
                      onPress={() => setShowDailyBreakdown(!showDailyBreakdown)}
                    >
                      <Text style={styles.collapsibleButtonText}>📋 Daily Salary Breakdown</Text>
                      <Text style={styles.collapsibleArrow}>{showDailyBreakdown ? '▼' : '▶'}</Text>
                    </TouchableOpacity>
                    
                    {/* Collapsible Content */}
                    {showDailyBreakdown && (
                      <View style={styles.collapsibleContent}>
                        {/* Explanation Section */}
                        <View style={styles.infoBox}>
                          <Text style={styles.infoBoxTitle}>ℹ️ How it works:</Text>
                          <Text style={styles.infoBoxText}>• Office hours: 9:00 AM - 7:00 PM</Text>
                          <Text style={styles.infoBoxText}>• Max paid hours: 10/day</Text>
                          <Text style={styles.infoBoxText}>• Late arrival reduces pay</Text>
                          <Text style={styles.infoBoxText}>• Overtime after 7 PM ignored</Text>
                        </View>
                        
                        {/* Fixed Table Header */}
                        <View style={styles.dailyTableHeader}>
                          <Text style={[styles.dailyTableHeaderText, { flex: 0.8, color: '#110f0f' }]}>Date</Text>
                          <Text style={[styles.dailyTableHeaderText, { flex: 0.8, color: '#110f0f' }]}>Mode</Text>
                          <Text style={[styles.dailyTableHeaderText, { flex: 1, color: '#110f0f' }]}>IN</Text>
                          <Text style={[styles.dailyTableHeaderText, { flex: 1, color: '#110f0f' }]}>OUT</Text>
                          <Text style={[styles.dailyTableHeaderText, { flex: 0.7, color: '#000000' }]}>Hrs</Text>
                          <Text style={[styles.dailyTableHeaderText, { flex: 1, color: '#000000' }]}>Salary</Text>
                          <Text style={[styles.dailyTableHeaderText, { flex: 0.8, color: '#000000' }]}>Deduction</Text>
                        </View>
                        
                        {/* Scrollable Table Rows */}
                        <ScrollView style={styles.dailyTableScrollView} nestedScrollEnabled={true}>
                          {selectedEmployee.daily_salaries && selectedEmployee.daily_salaries.length > 0 ? (
                            selectedEmployee.daily_salaries.map((day: any, index: number) => (
                              <View key={index} style={styles.dailyTableRow}>
                                <Text style={[styles.dailyTableCell, { flex: 0.8, color: '#000000' }]}>{day.date}</Text>
                                <Text style={[styles.dailyTableCell, { flex: 0.8, color: day.work_mode === 'WFH' ? '#ff9800' : '#4caf50' }]}>{day.work_mode || 'WFO'}</Text>
                                <Text style={[styles.dailyTableCell, { flex: 1, color: '#0e0d0d' }]}>{day.in_time_display || day.in_time}</Text>
                                <Text style={[styles.dailyTableCell, { flex: 1, color: '#0e0d0d' }]}>{day.out_time_display || day.out_time}</Text>
                                <Text style={[styles.dailyTableCell, { flex: 0.7, color: day.work_hours < 10 ? '#ff6b6b' : '#51cf66' }]}>{day.work_hours?.toFixed(1) || '0.0'}</Text>
                                <Text style={[styles.dailyTableCell, { flex: 1, color: '#4fcaf7' }]}>{formatCurrency(day.daily_salary)}</Text>
                                <Text style={[styles.dailyTableCell, { flex: 0.8, color: day.work_hours < 10 ? '#ff6b6b' : '#51cf66' }]}>
                                  {day.work_hours < 10 ? formatCurrency((10 - day.work_hours) * (selectedEmployee.per_hour_salary || selectedEmployee.per_day_salary / 10)) : '-'}
                                </Text>
                              </View>
                            ))
                          ) : (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                              <Text style={{ color: '#666', textAlign: 'center' }}>No daily salary data</Text>
                              <Text style={{ color: '#999', fontSize: 12, marginTop: 5 }}>Count: {(selectedEmployee.daily_salaries || []).length}</Text>
                            </View>
                          )}
                        </ScrollView>
                        
                        {/* Total Row */}
                        <View style={styles.dailyTableTotalRow}>
                          <Text style={[styles.dailyTableTotalText, { flex: 0.8, color: '#000000' }]}>Total</Text>
                          <Text style={[styles.dailyTableTotalText, { flex: 0.8, color: '#000000' }]}></Text>
                          <Text style={[styles.dailyTableTotalText, { flex: 1, color: '#000000' }]}></Text>
                          <Text style={[styles.dailyTableTotalText, { flex: 1, color: '#000000' }]}></Text>
                          <Text style={[styles.dailyTableTotalText, { flex: 0.7, color: '#000000' }]}>{selectedEmployee.total_work_hours?.toFixed(1) || '0.0'}</Text>
                          <Text style={[styles.dailyTableTotalText, { flex: 1, color: '#4fc3f7' }]}>{formatCurrency(selectedEmployee.total_salary_from_hours || 0)}</Text>
                          <Text style={[styles.dailyTableTotalText, { flex: 0.8, color: calculateDeduction() > 0 ? '#ff6b6b' : '#51cf66' }]}>
                            {calculateDeduction() > 0 ? formatCurrency(calculateDeduction()) : '-'}
                          </Text>
                        </View>

                        {/* Deduction Amount Row */}
                        <View style={styles.deductionRow}>
                          <Text style={styles.deductionLabel}>Deduction Amount:</Text>
                          <Text style={styles.deductionValue}>
                            {formatCurrency(calculateDeduction())}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Deductions Summary */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>💰 Salary Structure</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Per Day Salary</Text>
                    <Text style={styles.detailValue}>{formatCurrency(selectedEmployee.per_day_salary)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Per Hour Salary</Text>
                    <Text style={styles.detailValue}>{formatCurrency(selectedEmployee.per_hour_salary || selectedEmployee.per_day_salary / 10)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Deduction Days</Text>
                    <Text style={[styles.detailValue, {color: '#f44336'}]}>{selectedEmployee.total_deduction_days?.toFixed(2) || 0}</Text>
                  </View>
                  <View style={[styles.detailRow, styles.highlightRow]}>
                    <Text style={styles.detailLabel}>Total Deduction Amount</Text>
                    <Text style={[styles.detailValue, {color: '#f44336', fontSize: 16}]}>
                      -{formatCurrency(selectedEmployee.total_deduction_amount)}
                    </Text>
                  </View>
                </View>

                {/* Net Salary */}
                <View style={[styles.detailSection, styles.highlightSection]}>
                  <View style={styles.detailRow}>
                    <Text style={styles.netSalaryLabel}>Net Salary</Text>
                    <Text style={styles.netSalaryValue}>
                      {formatCurrency(selectedEmployee.net_salary)}
                    </Text>
                  </View>
                </View>

                {/* Status */}
                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={[styles.detailValue, {color: '#ec407a'}]}>{selectedEmployee.status}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: '#000' }]}>Generated</Text>
                    <Text style={styles.detailValue}>{selectedEmployee.generated_at ? new Date(selectedEmployee.generated_at).toLocaleDateString() : 'N/A'}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => {
                      setShowModal(false);
                      setShowSalaryModal(true);
                    }}
                  >
                    <Text style={styles.modalButtonText}>Update Salary</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.pdfButton]}
                    onPress={() => handleDownloadPDF(selectedEmployee.employee_id)}
                  >
                    <Text style={styles.modalButtonText}>Download PDF</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Update Salary Modal */}
      <Modal visible={showSalaryModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Base Salary</Text>

            <Text style={styles.inputLabel}>New Base Salary</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new salary"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              value={newSalary}
              onChangeText={setNewSalary}
            />

            <Text style={styles.inputLabel}>Effective From (YYYY-MM)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-01"
              placeholderTextColor="#aaa"
              value={effectiveFrom}
              onChangeText={setEffectiveFrom}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowSalaryModal(false);
                  setNewSalary("");
                  setEffectiveFrom("");
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleUpdateSalary}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Employee Salary Modal */}
      <Modal visible={showEmpModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Base Salary</Text>

            {selectedEmp && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Employee Name:</Text>
                  <Text style={styles.detailValue}>{selectedEmp.name}</Text>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Employee ID:</Text>
                  <Text style={styles.detailValue}>{selectedEmp.emp_id}</Text>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{selectedEmp.gmail}</Text>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Role:</Text>
                  <Text style={styles.detailValue}>{selectedEmp.role}</Text>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Department:</Text>
                  <Text style={styles.detailValue}>{selectedEmp.department}</Text>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Work Type:</Text>
                  <Text style={styles.detailValue}>{selectedEmp.employment_type || "WFO"}</Text>
                </View>
              </ScrollView>
            )}

            <Text style={styles.inputLabel}>Base Salary (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter base salary"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              value={newSalary}
              onChangeText={setNewSalary}
            />

            <Text style={styles.inputLabel}>Effective From (YYYY-MM)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-01"
              placeholderTextColor="#aaa"
              value={effectiveFrom}
              onChangeText={setEffectiveFrom}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEmpModal(false);
                  setNewSalary("");
                  setEffectiveFrom("");
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleUpdateEmpSalary}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* OT Request Review Modal */}
      <Modal visible={otModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📋 Review OT Request</Text>

            {selectedOtRequest && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, {fontWeight: 'bold', fontSize: 16}]}>{selectedOtRequest.employee_name}</Text>
                  <Text style={[styles.detailValue, {color: '#666'}]}>ID: {selectedOtRequest.employee_id}</Text>
                </View>

                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Department:</Text>
                    <Text style={styles.detailValue}>{selectedOtRequest.department}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>OT Date:</Text>
                    <Text style={styles.detailValue}>{formatOtDate(selectedOtRequest.ot_date)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Hours:</Text>
                    <Text style={styles.detailValue}>{selectedOtRequest.ot_hours}</Text>
                  </View>
                  {selectedOtRequest.reason && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Reason:</Text>
                      <Text style={styles.detailValue}>{selectedOtRequest.reason}</Text>
                    </View>
                  )}
                </View>

                {selectedOtRequest.department === 'Hardware' ? (
                  <View style={styles.otInputGroup}>
                    <Text style={styles.otLabel}>Incentive Amount (₹) *</Text>
                    <TextInput
                      style={styles.otInput}
                      placeholder="Enter incentive amount"
                      placeholderTextColor="#999"
                      value={incentiveAmount}
                      onChangeText={setIncentiveAmount}
                      keyboardType="numeric"
                    />
                  </View>
                ) : (
                  <View style={styles.otInputGroup}>
                    <Text style={styles.otLabel}>Paid Off Days *</Text>
                    <TextInput
                      style={styles.otInput}
                      placeholder="Enter paid off days"
                      placeholderTextColor="#999"
                      value={paidOffDays}
                      onChangeText={setPaidOffDays}
                      keyboardType="numeric"
                    />
                  </View>
                )}

                <View style={styles.otInputGroup}>
                  <Text style={styles.otLabel}>Comment</Text>
                  <TextInput
                    style={[styles.otInput, styles.otTextArea]}
                    placeholder="Enter comment (required for rejection)"
                    placeholderTextColor="#999"
                    value={adminComment}
                    onChangeText={setAdminComment}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.otModalButtons}>
                  <TouchableOpacity
                    style={[styles.otModalButton, styles.otCancelButton]}
                    onPress={() => setOtModalVisible(false)}
                  >
                    <Text style={styles.otModalButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.otModalButton, styles.otRejectButton]}
                    onPress={handleRejectOt}
                    disabled={otReviewLoading}
                  >
                    {otReviewLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.otModalButtonText}>Reject</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.otModalButton, styles.otApproveButton]}
                    onPress={handleApproveOt}
                    disabled={otReviewLoading}
                  >
                    {otReviewLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.otModalButtonText}>Approve</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  activeTabButton: {
    backgroundColor: "#c2185b",
  },
  tabButtonText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "bold",
  },
  activeTabButtonText: {
    color: "white",
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  monthButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 12,
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  monthButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  monthText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginHorizontal: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  generateButton: {
    backgroundColor: "#c2185b",
  },
  emailButton: {
    backgroundColor: "#c2185b",
    flex: 1,
  },
  excelButton: {
    backgroundColor: "#217346",
    flex: 1,
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingContainer: {
    alignItems: "center",
    padding: 30,
  },
  loadingText: {
    color: "white",
    marginTop: 10,
    fontSize: 16,
  },
  listContainer: {
    marginTop: 10,
  },
  listTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  employeeCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  employeeId: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
  salaryInfo: {
    alignItems: "flex-end",
  },
  netSalary: {
    color: "#ec407a",
    fontSize: 18,
    fontWeight: "bold",
  },
  statusText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  noDataContainer: {
    alignItems: "center",
    padding: 40,
  },
  noDataText: {
    color: "white",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 10,
  },
  noDataSubtext: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
  },
  // Daily Breakdown Section Styles
  dailyTableHeader: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderRadius: 5,
    marginBottom: 10,
  },
  dailyTableHeaderText: {
    color: "#ec407a",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  dailyTableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  dailyTableCell: {
    color: "white",
    fontSize: 12,
    textAlign: "center",
  },
  dailyTableTotalRow: {
    flexDirection: "row",
    backgroundColor: "rgba(236, 64, 122, 0.2)",
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderRadius: 5,
    marginTop: 10,
  },
  dailyTableTotalText: {
    color: "#ec407a",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  // Collapsible styles
  collapsibleButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: 12,
    borderRadius: 8,
  },
  collapsibleButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  collapsibleArrow: {
    color: "white",
    fontSize: 14,
  },
  collapsibleContent: {
    marginTop: 10,
  },
  // Info box styles
  infoBox: {
    backgroundColor: "rgba(236, 64, 122, 0.15)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(236, 64, 122, 0.3)",
  },
  infoBoxTitle: {
    color: "#ec407a",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
  },
  infoBoxText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginBottom: 3,
  },
  dailyTableScrollView: {
    maxHeight: 250,
  },
  // Deduction row styles
  deductionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(236, 64, 122, 0.2)",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  deductionLabel: {
    color: "#f44336",
    fontSize: 14,
    fontWeight: "bold",
  },
  deductionValue: {
    color: "#f44336",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#641b9a",
    textAlign: "center",
    marginBottom: 20,
  },
  detailSection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    textAlign: "right",
    flex: 1,
  },
  detailSubValue: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#641b9a",
    marginBottom: 10,
    marginTop: 5,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  highlightRow: {
    backgroundColor: "#ffebee",
    padding: 8,
    borderRadius: 6,
    marginTop: 5,
  },
  netSalaryLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  netSalaryValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#c2185b",
  },
  highlightSection: {
    backgroundColor: "#e8f5e9",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  pdfButton: {
    backgroundColor: "#c2185b",
  },
  cancelButton: {
    backgroundColor: "#9e9e9e",
  },
  saveButton: {
    backgroundColor: "#c2185b",
  },
  modalButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  closeButton: {
    backgroundColor: "#f44336",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  inputLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  baseSalaryText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 2,
  },
  updateSalaryButton: {
    backgroundColor: "#ff9800",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  updateSalaryButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  activeBadge: {
    backgroundColor: "#c2185b",
  },
  inactiveBadge: {
    backgroundColor: "#9e9e9e",
  },
  statusBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  // OT Request Styles
  sectionHeader: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  loader: {
    marginTop: 50,
  },
  otInputGroup: {
    marginBottom: 15,
  },
  otLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  otInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  otTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  otModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  otModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  otCancelButton: {
    backgroundColor: '#999',
  },
  otRejectButton: {
    backgroundColor: '#f44336',
  },
  otApproveButton: {
    backgroundColor: '#4CAF50',
  },
  otModalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  otRequestCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  otRequestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  otEmployeeName: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  otEmployeeId: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  otStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  otStatusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  otRequestDetails: {
    marginBottom: 10,
  },
  otDetailRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  otDetailLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    width: 100,
  },
  otDetailValue: {
    color: "white",
    fontSize: 14,
    flex: 1,
  },
  otReviewButton: {
    backgroundColor: "#4CAF50",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  otReviewButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  otIncentiveRow: {
    flexDirection: "row",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  otIncentiveLabel: {
    color: "#4CAF50",
    fontSize: 14,
    fontWeight: "bold",
  },
  otIncentiveValue: {
    color: "#4CAF50",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 5,
  },
  // Work Mode Filter Styles
  workModeFilterContainer: {
    marginTop: 15,
    marginBottom: 10,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
  },
  filterLabel: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
  },
  workModeTabs: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  workModeTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: "center",
  },
  activeWorkModeTab: {
    backgroundColor: "#ec407a",
  },
  workModeTabText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "bold",
  },
  activeWorkModeTabText: {
    color: "white",
  },
});

export default AdminPayroll;
