import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import payrollService, { PayrollData } from "./services/payrollService";

const Payroll = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [payrollData, setPayrollData] = useState<PayrollData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [user, setUser] = useState<any>(null);
  const [showDailyBreakdown, setShowDailyBreakdown] = useState(false);

  // Get current month as default
  useEffect(() => {
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(month);
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        // Load payroll after getting user
        if (selectedMonth) {
          fetchPayroll(parsedUser.emp_id, selectedMonth);
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const fetchPayroll = async (empId: string, month: string) => {
    if (!empId || !month) return;

    setLoading(true);
    try {
      const result = await payrollService.getMyPayroll(empId, month);
      if (result.success && result.data) {
        setPayrollData(result.data);
      } else {
        setPayrollData(null);
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
    if (user?.emp_id) {
      fetchPayroll(user.emp_id, newMonthStr);
    }
  };

  const handleViewPayroll = () => {
    if (user?.emp_id && selectedMonth) {
      fetchPayroll(user.emp_id, selectedMonth);
    }
  };

  const handleDownloadPDF = async () => {
    if (!user?.emp_id || !selectedMonth) return;

    try {
      const result = await payrollService.exportPayrollPDF(user.emp_id, selectedMonth);
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
    return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate deduction based on expected vs actual hours
  const calculateDeduction = () => {
    if (!payrollData || !payrollData.daily_salaries || payrollData.daily_salaries.length === 0) {
      return 0;
    }
    
    const perHourSalary = payrollData.per_hour_salary || (payrollData.per_day_salary / 10);
    let totalExpectedHours = payrollData.daily_salaries.length * 10; // 10 hours expected per day
    let totalActualHours = payrollData.total_work_hours || 0;
    
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

  return (
    <LinearGradient colors={["#ec407a", "#641b9a"]} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>💰 Payroll</Text>

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

        {/* View Button */}
        <TouchableOpacity style={styles.viewButton} onPress={handleViewPayroll}>
          <Text style={styles.viewButtonText}>View Salary Slip</Text>
        </TouchableOpacity>

        {/* OT Request Button */}
        <TouchableOpacity 
          style={[styles.viewButton, styles.otRequestButton]} 
          onPress={() => router.push('/otRequest')}
        >
          <Text style={styles.viewButtonText}>📝 OT Request</Text>
        </TouchableOpacity>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading payroll data...</Text>
          </View>
        )}

        {/* Payroll Data Display */}
        {!loading && payrollData && (
          <View style={styles.payrollCard}>
            {/* Employee Info */}
            <View style={styles.infoSection}>
              <Text style={styles.employeeName}>{payrollData.employee_name}</Text>
              <Text style={styles.employeeId}>ID: {payrollData.employee_id}</Text>
            </View>

            {/* Base Salary */}
            <View style={styles.salarySection}>
              <Text style={styles.salaryLabel}>Base Salary</Text>
              <Text style={styles.salaryAmount}>
                {formatCurrency(payrollData.base_salary)}
              </Text>
            </View>

            {/* Attendance Details */}
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>📅 Attendance Details</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Working Days</Text>
                <Text style={styles.detailValue}>{payrollData.total_working_days}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Present Days</Text>
                <Text style={[styles.detailValue, { color: "#7b1fa2" }]}>
                  {payrollData.present_days}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Paid Off Days</Text>
                <Text style={[styles.detailValue, { color: "#2196f3" }]}>
                  {payrollData.paid_off_days}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Optional Holiday Days</Text>
                <Text style={[styles.detailValue, { color: "#9c27b0" }]}>
                  {payrollData.optional_holiday_days || 0}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fixed Holiday Days</Text>
                <Text style={[styles.detailValue, { color: "#7b1fa2" }]}>
                  {payrollData.fixed_holiday_days || 0}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Leave Days</Text>
                <Text style={[styles.detailValue, { color: "#ff9800" }]}>
                  {payrollData.leave_days}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Absent Days</Text>
                <Text style={[styles.detailValue, { color: "#f44336" }]}>
                  {payrollData.absent_days}
                </Text>
              </View>
            </View>

            {/* Work Hours Details */}
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>⏱️ Work Hours Details</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Work Hours</Text>
                <Text style={[styles.detailValue, { color: "#7b1fa2" }]}>
                  {payrollData.total_work_hours || 0} hrs
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Per Hour Salary</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(payrollData.per_hour_salary || 0)}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Short Hours Days</Text>
                <Text style={[styles.detailValue, { color: "#ff9800" }]}>
                  {payrollData.short_hours_days || 0}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Short Hours Deduction</Text>
                <Text style={[styles.detailValue, { color: "#f44336" }]}>
                  {payrollData.short_hours_deduction || 0} days ({formatCurrency((payrollData.short_hours_deduction || 0) * payrollData.per_day_salary)})
                </Text>
              </View>
              
              {payrollData.calculation_method && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Calculation Method</Text>
                  <Text style={[styles.detailValue, { color: "#2196f3" }]}>
                    Work Hours Based
                  </Text>
                </View>
              )}
              
              {payrollData.office_start_time && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Office Time</Text>
                  <Text style={styles.detailValue}>
                    {payrollData.office_start_time} - {payrollData.office_end_time}
                  </Text>
                </View>
              )}
            </View>

            {/* Late & Permission Details */}
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>⏰ Late & Permissions</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Late Days</Text>
                <Text style={styles.detailValue}>{payrollData.late_days}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Late Deduction</Text>
                <Text style={[styles.detailValue, { color: "#f44336" }]}>
                  {payrollData.late_deduction_days} days
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Permission Hours</Text>
                <Text style={styles.detailValue}>{payrollData.permission_hours} hrs</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Permission Deduction</Text>
                <Text style={[styles.detailValue, { color: "#f44336" }]}>
                  {payrollData.permission_deduction_days} days
                </Text>
              </View>
            </View>

            {/* Deductions */}
            <View style={styles.deductionSection}>
              <Text style={styles.sectionTitle}>📉 Deductions</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Deduction Days</Text>
                <Text style={[styles.detailValue, { color: "#f44336" }]}>
                  {payrollData.total_deduction_days} days
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Per Day Salary</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(payrollData.per_day_salary)}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Deduction Amount</Text>
                <Text style={[styles.detailValue, { color: "#f44336", fontWeight: "bold" }]}>
                  -{formatCurrency(payrollData.total_deduction_amount)}
                </Text>
              </View>
            </View>

            {/* Net Salary */}
            <View style={styles.netSalarySection}>
              <Text style={styles.netSalaryLabel}>💵 Net Salary</Text>
              <Text style={styles.netSalaryAmount}>
                {formatCurrency(payrollData.net_salary)}
              </Text>
            </View>

            {/* Daily Salary Breakdown - Collapsible */}
            {payrollData.daily_salaries && payrollData.daily_salaries.length > 0 && (
              <View style={styles.dailyBreakdownSection}>
                {/* Collapsible Button */}
                <TouchableOpacity 
                  style={styles.collapsibleButton}
                  onPress={() => setShowDailyBreakdown(!showDailyBreakdown)}
                >
                  <Text style={styles.collapsibleButtonText}>📅 Daily Salary Breakdown</Text>
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
                      <Text style={[styles.dailyTableHeaderText, { flex: 0.8, color: '#ffffff' }]}>Date</Text>
                      <Text style={[styles.dailyTableHeaderText, { flex: 0.8, color: '#ffffff' }]}>Mode</Text>
                      <Text style={[styles.dailyTableHeaderText, { flex: 1, color: '#ffffff' }]}>IN</Text>
                      <Text style={[styles.dailyTableHeaderText, { flex: 1, color: '#ffffff' }]}>OUT</Text>
                      <Text style={[styles.dailyTableHeaderText, { flex: 0.7, color: '#000000' }]}>Hrs</Text>
                      <Text style={[styles.dailyTableHeaderText, { flex: 1, color: '#000000' }]}>Salary</Text>
                      <Text style={[styles.dailyTableHeaderText, { flex: 0.8, color: '#000000' }]}>Deduction</Text>
                    </View>
                    
                    {/* Scrollable Table Rows */}
                    <ScrollView style={styles.dailyTableScrollView} nestedScrollEnabled={true}>
                      {payrollData.daily_salaries.map((day: any, index: number) => (
                        <View key={index} style={styles.dailyTableRow}>
                          <Text style={[styles.dailyTableCell, { flex: 0.8, color: '#000000' }]}>
                            {day.date ? day.date.split('-')[2] : '-'}
                          </Text>
                          <Text style={[styles.dailyTableCell, { flex: 0.8, color: day.work_mode === 'WFH' ? '#ff9800' : '#4caf50' }]}>
                            {day.work_mode || 'WFO'}
                          </Text>
                          <Text style={[styles.dailyTableCell, { flex: 1, color: '#ffffff' }]}>
                            {day.in_time_display || '-'}
                          </Text>
                          <Text style={[styles.dailyTableCell, { flex: 1, color: '#ffffff' }]}>
                            {day.out_time_display || '-'}
                          </Text>
                          <Text style={[styles.dailyTableCell, { flex: 0.7, color: day.work_hours < 10 ? '#ff6b6b' : '#51cf66' }]}>
                            {day.work_hours?.toFixed(1) || '0.0'}
                          </Text>
                          <Text style={[styles.dailyTableCell, { flex: 1, color: '#4fc3f7' }]}>
                            {formatCurrency(day.daily_salary)}
                          </Text>
                          <Text style={[styles.dailyTableCell, { flex: 0.8, color: day.work_hours < 10 ? '#ff6b6b' : '#51cf66' }]}>
                            {day.work_hours < 10 ? formatCurrency((10 - day.work_hours) * (payrollData.per_hour_salary || payrollData.per_day_salary / 10)) : '-'}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                    
                    {/* Total Row */}
                    <View style={styles.dailyTableTotalRow}>
                      <Text style={[styles.dailyTableTotalText, { flex: 0.8, color: '#000000' }]}>Total</Text>
                      <Text style={[styles.dailyTableTotalText, { flex: 1, color: '#ffffff' }]}></Text>
                      <Text style={[styles.dailyTableTotalText, { flex: 1, color: '#ffffff' }]}></Text>
                      <Text style={[styles.dailyTableTotalText, { flex: 0.7, color: '#000000' }]}>
                        {payrollData.total_work_hours?.toFixed(1) || '0.0'}
                      </Text>
                      <Text style={[styles.dailyTableTotalText, { flex: 1, color: '#4fc3f7' }]}>
                        {formatCurrency(payrollData.total_salary_from_hours || 0)}
                      </Text>
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

            {/* Download PDF Button */}
            <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadPDF}>
              <Text style={styles.downloadButtonText}>📥 Download Salary Slip (PDF)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* No Data Message */}
        {!loading && !payrollData && (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>
              No payroll data available for {getMonthName(selectedMonth)}
            </Text>
            <Text style={styles.noDataSubtext}>
              Please contact your administrator if you believe this is an error.
            </Text>
          </View>
        )}
      </ScrollView>
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
    fontSize: 32,
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
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
    fontSize: 22,
    fontWeight: "bold",
    marginHorizontal: 20,
  },
  viewButton: {
    backgroundColor: "rgba(255,255,255,0.3)",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  viewButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  otRequestButton: {
    backgroundColor: "rgba(123, 31, 162, 0.6)",
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
  payrollCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  infoSection: {
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.2)",
  },
  employeeName: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  employeeId: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 5,
  },
  salarySection: {
    alignItems: "center",
    marginBottom: 20,
    padding: 15,
    backgroundColor: "rgba(236, 64, 122, 0.3)",
    borderRadius: 10,
  },
  salaryLabel: {
    color: "white",
    fontSize: 14,
  },
  salaryAmount: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 5,
  },
  detailsSection: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 10,
  },
  sectionTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  detailLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  detailValue: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  deductionSection: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: "rgba(244,67,54,0.2)",
    borderRadius: 10,
  },
  netSalarySection: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(236, 64, 122, 0.4)",
    borderRadius: 10,
    marginBottom: 20,
  },
  netSalaryLabel: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  netSalaryAmount: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "bold",
    marginTop: 10,
  },
  downloadButton: {
    backgroundColor: "#c2185b",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  downloadButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
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
  dailyBreakdownSection: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: 15,
    marginTop: 15,
    marginBottom: 15,
  },
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
    backgroundColor: "rgba(244,67,54,0.2)",
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
});

export default Payroll;
