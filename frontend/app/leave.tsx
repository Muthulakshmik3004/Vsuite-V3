import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import API_BASE_URL from "../config";

// Types
interface OptionalHoliday {
  id: string;
  name: string;
  date: string;
  year: number;
  holiday_type?: string;  // "optional" or "fixed"
}

interface OptionalCount {
  used: number;
  remaining: number;
}

const Leave = () => {
  // Leave type options for dropdown
  const LEAVE_TYPES = [
    { label: "Sick Leave", value: "sick" },
    { label: "General Leave", value: "general" },
    { label: "Optional Holiday", value: "optional" },
  ];

  // Reasons for each leave type
  const SICK_REASONS = [
    "Fever",
    "Cold",
    "Headache",
    "Vomiting",
    "Body Pain",
    "Stomach Pain",
    "Cough",
    "Throat Infection",
    "Food Poisoning",
    "Other",
  ];

  const GENERAL_REASONS = [
    "Family Visit",
    "Certification Exam",
    "Religious Function",
    "Personal Work",
    "Medical Check-Up",
    "Family Function",
    "Travel Plan (Booked Earlier)",
    "Document Appointment (Aadhaar/PAN/Passport)",
    "Bank Work",
    "House Repair / Maintenance",
    "Other",
  ];

  // State
  const [selectedLeaveType, setSelectedLeaveType] = useState("sick");
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [sickReason, setSickReason] = useState("");
  const [customSickReason, setCustomSickReason] = useState("");
  
  const [generalReason, setGeneralReason] = useState("");
  const [customGeneralReason, setCustomGeneralReason] = useState("");

  // Optional Holiday state
  const [optionalCount, setOptionalCount] = useState<OptionalCount>({ used: 0, remaining: 2 });
  const [optionalCountLoading, setOptionalCountLoading] = useState(false);
  const [optionalHolidays, setOptionalHolidays] = useState<OptionalHoliday[]>([]);
  const [optionalHolidaysLoading, setOptionalHolidaysLoading] = useState(false);
  const [selectedHolidayId, setSelectedHolidayId] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const [pickerMode, setPickerMode] = useState("from");
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  // Fetch optional holiday count and list when Optional Holiday is selected
  useEffect(() => {
    if (selectedLeaveType === "optional") {
      fetchOptionalCount();
      fetchOptionalHolidays();
    }
  }, [selectedLeaveType]);

  // Fetch optional leave count
  const fetchOptionalCount = async () => {
    setOptionalCountLoading(true);
    try {
      const userData = await AsyncStorage.getItem("user");
      const user = JSON.parse(userData);
      
      const response = await fetch(
        `${API_BASE_URL}/api/optional-leave/count/${user.emp_id}/`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setOptionalCount({
          used: data.used || 0,
          remaining: data.remaining || 2,
        });
      }
    } catch (err) {
      console.error("Error fetching optional count:", err);
    } finally {
      setOptionalCountLoading(false);
    }
  };

  // Fetch optional holidays list
  const fetchOptionalHolidays = async () => {
    setOptionalHolidaysLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/optional-holidays/`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        // Filter only optional holidays (exclude fixed holidays)
        const optionalOnly = (data.holidays || []).filter(
          (h: OptionalHoliday) => h.holiday_type === 'optional'
        );
        // Sort holidays by date ascending
        const sortedHolidays = optionalOnly.sort(
          (a: OptionalHoliday, b: OptionalHoliday) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setOptionalHolidays(sortedHolidays);
      }
    } catch (err) {
      console.error("Error fetching optional holidays:", err);
    } finally {
      setOptionalHolidaysLoading(false);
    }
  };

  const showPicker = (mode: string) => {
    setPickerMode(mode);
    setDatePickerVisibility(true);
  };

  const hidePicker = () => setDatePickerVisibility(false);

  const confirmDate = (date: Date) => {
    pickerMode === "from" ? setFromDate(date) : setToDate(date);
    hidePicker();
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    if (typeof date === "string") {
      // Format string date to DD MMM YYYY
      const d = new Date(date);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    return date.toISOString().split("T")[0];
  };

  // Get selected holiday object
  const selectedHoliday = optionalHolidays.find(h => h.id === selectedHolidayId);

  // Submit Sick Leave (Emergency)
  const handleSickLeaveSubmit = async () => {
    if (!sickReason) {
      return Alert.alert("Error", "Select a reason for sick leave");
    }

    try {
      const userData = await AsyncStorage.getItem("user");
      const user = JSON.parse(userData);

      const today = new Date().toISOString().split("T")[0];
      const finalReason = sickReason === "Other" ? customSickReason : sickReason;

      const body = {
        user_id: user.emp_id,
        user_name: user.name,
        department: user.department,
        fromDate: today,
        toDate: today,
        reason: finalReason,
      };

      const response = await fetch(
        `${API_BASE_URL}/api/leaves/create_Emergency_leave/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (data.status === "success") {
        Alert.alert("Success", "Sick Leave Submitted");
        setSickReason("");
        setCustomSickReason("");
      } else if (data.status === "exists") {
        Alert.alert("Already Taken", "You already applied sick leave today.");
      } else if (data.status === "limit") {
        Alert.alert("Limit Reached", "You have already used all 3 sick leaves this month.");
      } else {
        Alert.alert("Error", data.message || "Failed to submit sick leave");
      }
    } catch (err) {
      console.error("Sick leave error:", err);
      Alert.alert("Error", "Cannot submit sick leave");
    }
  };

  // Submit General Leave
  const handleGeneralLeaveSubmit = async () => {
    // General Leave - require dates
    if (!fromDate || !toDate) {
      return Alert.alert("Error", "Select From & To Date");
    }

    if (!generalReason) {
      return Alert.alert("Error", "Select a reason");
    }

    try {
      const userData = await AsyncStorage.getItem("user");
      const user = JSON.parse(userData);

      const finalReason = generalReason === "Other" ? customGeneralReason : generalReason;

      const body = {
        user_id: user.emp_id,
        user_name: user.name,
        department: user.department,
        fromDate: formatDate(fromDate),
        toDate: formatDate(toDate),
        reason: finalReason,
        leave_type: "general",
      };

      const response = await fetch(`${API_BASE_URL}/api/leaves/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "General Leave Submitted");
        setGeneralReason("");
        setCustomGeneralReason("");
        setFromDate(null);
        setToDate(null);
      } else if (data.error) {
        Alert.alert("Error", data.error);
      } else {
        Alert.alert("Error", "Leave must be applied at least 3 days before the leave date.");
      }
    } catch (err) {
      console.error("General leave error:", err);
      Alert.alert("Error", "Cannot submit leave");
    }
  };

  // Submit Optional Holiday - With STRICT enforcement
  const handleOptionalHolidaySubmit = async () => {
    // Frontend enforcement: Require holiday selection
    if (!selectedHolidayId) {
      return Alert.alert("Error", "Please select an Optional Holiday.");
    }
    
    // Frontend enforcement: Check if already used 2 optional holidays
    if (optionalCount.remaining <= 0) {
      return Alert.alert(
        "Limit Reached", 
        "You have already used 2 Optional Holidays this year. Additional requests cannot be submitted."
      );
    }

    try {
      const userData = await AsyncStorage.getItem("user");
      const user = JSON.parse(userData);

      const body = {
        user_id: user.emp_id,
        user_name: user.name,
        department: user.department,
        // Use the selected holiday's date
        fromDate: selectedHoliday!.date,
        toDate: selectedHoliday!.date,
        // No reason required for optional holiday
        reason: null,
        leave_type: "optional",
      };

      const response = await fetch(`${API_BASE_URL}/api/leaves/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          "Success", 
          "Optional Holiday request submitted. Requires admin approval."
        );
        fetchOptionalCount(); // Refresh count
        setSelectedHolidayId(null);
      } else if (data.error) {
        // Backend returned error - show specific message
        Alert.alert("Error", data.error);
      } else {
        Alert.alert("Error", "Failed to submit Optional Holiday");
      }
    } catch (err) {
      console.error("Optional holiday error:", err);
      Alert.alert("Error", "Cannot submit Optional Holiday. Please try again.");
    }
  };

  // Determine if submit should be disabled for optional holiday - STRICT enforcement
  const isOptionalSubmitDisabled = 
    optionalCount.remaining <= 0 || !selectedHolidayId;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient colors={["#ec407a", "#641b9a"]} style={styles.container}>
        <Text style={styles.title}>Leave Request</Text>

        {/* Leave Type Dropdown */}
        <View style={styles.dropdownContainer}>
          <Text style={styles.label}>Leave Type</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <Text style={styles.dropdownText}>
              {LEAVE_TYPES.find(t => t.value === selectedLeaveType)?.label || "Select Leave Type"}
            </Text>
            <Text style={styles.dropdownArrow}>{showDropdown ? "▲" : "▼"}</Text>
          </TouchableOpacity>
          
          {showDropdown && (
            <View style={styles.dropdownMenu}>
              {LEAVE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.dropdownItem,
                    selectedLeaveType === type.value && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedLeaveType(type.value);
                    setShowDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    selectedLeaveType === type.value && styles.dropdownItemTextSelected,
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Optional Holiday Counter Banner */}
        {selectedLeaveType === "optional" && (
          <View style={styles.infoBanner}>
            {optionalCountLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Text style={styles.infoText}>
                  Optional Holidays Used: {optionalCount.used} / 2
                </Text>
                {optionalCount.remaining <= 0 && (
                  <Text style={styles.warningText}>
                    You have already used 2 Optional Holidays this year.
                  </Text>
                )}
              </>
            )}
          </View>
        )}

        {/* SICK LEAVE SECTION */}
        {selectedLeaveType === "sick" && (
          <ScrollView style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🏥 Sick Leave</Text>

            <Text style={styles.label}>Select Reason</Text>
            <View style={styles.reasonContainer}>
              {SICK_REASONS.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.reasonBtn,
                    sickReason === item && styles.reasonBtnSelected,
                  ]}
                  onPress={() => setSickReason(item)}
                >
                  <Text style={styles.reasonText}>
                    {sickReason === item ? "✔ " : ""}{item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {sickReason === "Other" && (
              <View style={styles.inputContainer}>
                <TouchableOpacity 
                  style={styles.submitButton} 
                  onPress={handleSickLeaveSubmit}
                >
                  <Text style={styles.submitText}>Submit Sick Leave</Text>
                </TouchableOpacity>
              </View>
            )}

            {sickReason !== "Other" && (
              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={handleSickLeaveSubmit}
              >
                <Text style={styles.submitText}>Submit Sick Leave</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {/* GENERAL LEAVE SECTION */}
        {selectedLeaveType === "general" && (
          <ScrollView style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>📅 General Leave</Text>

            <Text style={styles.label}>From Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => showPicker("from")}
            >
              <Text style={styles.dateText}>
                {fromDate ? formatDate(fromDate) : "Select From Date"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>To Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => showPicker("to")}
            >
              <Text style={styles.dateText}>
                {toDate ? formatDate(toDate) : "Select To Date"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Select Reason</Text>
            <View style={styles.reasonContainer}>
              {GENERAL_REASONS.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.reasonBtn,
                    generalReason === item && styles.reasonBtnSelected,
                  ]}
                  onPress={() => setGeneralReason(item)}
                >
                  <Text style={styles.reasonText}>
                    {generalReason === item ? "✔ " : ""}{item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {generalReason === "Other" && (
              <View style={styles.inputContainer}>
                <TouchableOpacity 
                  style={styles.submitButton} 
                  onPress={handleGeneralLeaveSubmit}
                >
                  <Text style={styles.submitText}>Submit Leave</Text>
                </TouchableOpacity>
              </View>
            )}

            {generalReason !== "Other" && (
              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={handleGeneralLeaveSubmit}
              >
                <Text style={styles.submitText}>Submit Leave</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {/* OPTIONAL HOLIDAY SECTION - SIMPLE VERSION */}
        {selectedLeaveType === "optional" && (
          <ScrollView style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🎯 Optional Holiday</Text>

            {/* Holiday List Selection Only */}
            <View style={styles.holidayListContainer}>
              <Text style={styles.label}>Select Optional Holiday</Text>
              
              {optionalHolidaysLoading ? (
                <ActivityIndicator color="#ec407a" size="small" />
              ) : optionalHolidays.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    No Optional Holidays available this year.
                  </Text>
                  <Text style={styles.emptySubtext}>
                    Please contact your administrator.
                  </Text>
                </View>
              ) : (
                optionalHolidays.map((holiday) => (
                  <TouchableOpacity
                    key={holiday.id}
                    style={[
                      styles.holidayItem,
                      selectedHolidayId === holiday.id && styles.holidayItemSelected,
                    ]}
                    onPress={() => setSelectedHolidayId(holiday.id)}
                  >
                    <View style={styles.radioContainer}>
                      <View style={[
                        styles.radio,
                        selectedHolidayId === holiday.id && styles.radioSelected,
                      ]}>
                        {selectedHolidayId === holiday.id && (
                          <View style={styles.radioInner} />
                        )}
                      </View>
                    </View>
                    <View style={styles.holidayDetails}>
                      <Text style={[
                        styles.holidayName,
                        selectedHolidayId === holiday.id && styles.holidayNameSelected,
                      ]}>
                        {holiday.name}
                      </Text>
                      <Text style={styles.holidayDate}>
                        {formatDate(holiday.date)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Submit Button - No reason required */}
            <TouchableOpacity 
              style={[
                styles.submitButton,
                isOptionalSubmitDisabled && styles.submitButtonDisabled,
              ]} 
              onPress={handleOptionalHolidaySubmit}
              disabled={isOptionalSubmitDisabled}
            >
              <Text style={styles.submitText}>Submit Optional Holiday</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* DATE PICKER */}
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={confirmDate}
          onCancel={hidePicker}
        />
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 40 },
  title: {
    fontSize: 32,
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    color: "white",
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "bold",
  },
  
  /* Dropdown Styles */
  dropdownContainer: {
    marginBottom: 20,
    zIndex: 100,
  },
  dropdown: {
    backgroundColor: "rgba(255,255,255,0.25)",
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  dropdownText: {
    color: "white",
    fontSize: 16,
  },
  dropdownArrow: {
    color: "white",
    fontSize: 14,
  },
  dropdownMenu: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    marginTop: 5,
    overflow: "hidden",
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  dropdownItemSelected: {
    backgroundColor: "rgba(236, 64, 122, 0.2)",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#333",
  },
  dropdownItemTextSelected: {
    color: "#ec407a",
    fontWeight: "bold",
  },

  /* Info Banner */
  infoBanner: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  infoText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  warningText: {
    color: "#ffeb3b",
    fontSize: 12,
    textAlign: "center",
    marginTop: 5,
  },

  /* Section Card */
  sectionCard: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: "rgba(255, 170, 200, 0.35)",
  },
  sectionTitle: {
    color: "white",
    fontSize: 22,
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 20,
  },

  /* Reason Buttons */
  reasonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  reasonBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  reasonBtnSelected: {
    backgroundColor: "rgba(255, 194, 222, 0.9)",
    borderWidth: 2,
    borderColor: "white",
  },
  reasonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },

  /* Input Container */
  inputContainer: {
    marginBottom: 20,
  },

  /* Date */
  dateInput: {
    backgroundColor: "rgba(255,255,255,0.25)",
    padding: 14,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  dateText: { color: "white", fontSize: 16 },

  /* Holiday List Styles */
  holidayListContainer: {
    marginBottom: 20,
  },
  holidayItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  holidayItemSelected: {
    backgroundColor: "rgba(255, 194, 222, 0.4)",
    borderColor: "#ec407a",
    borderWidth: 2,
  },
  radioContainer: {
    marginRight: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: "#ec407a",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ec407a",
  },
  holidayDetails: {
    flex: 1,
  },
  holidayName: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  holidayNameSelected: {
    color: "#ec407a",
  },
  holidayDate: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginTop: 2,
  },
  emptyState: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
  },
  emptySubtext: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 5,
  },

  /* Submit Button */
  submitButton: {
    backgroundColor: "rgba(255,255,255,0.3)",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: "rgba(128,128,128,0.5)",
  },
  submitText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default Leave;
