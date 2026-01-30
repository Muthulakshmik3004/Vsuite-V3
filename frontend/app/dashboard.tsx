import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Animated,
  Alert,
  Platform,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import CONFIG_API_BASE_URL from "../config";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing"; // fallback for web/unsupported devices
// Helper to trim long client addresses
const trimAddress = (address?: string) => {
  if (!address) return "-";
  const parts = address.split(",").map((p) => p.trim());
  return parts.slice(0, 2).join("| "); // Only show first 2 parts
};

const API_BASE_URL = `${CONFIG_API_BASE_URL}/api`;


type Punch = {
  inTime?: string;
  outTime?: string;
  workingHours?: string;
  inDateTime?: string | null;
  outDateTime?: string | null;
  time?: string; // for raw punch objects
  type?: string;
  server_timestamp_ist?: string;
};

type EmployeePresentItem = {
  id: string;
  name: string;
  department?: string;
  role?: string;
  punches: Punch[];
  status?: "Present" | "Late" | "Absent";
  client_distance_km?: any;
  client_address?: string;
  office_logout_reason?: string;
};

const DashboardScreen: React.FC = () => {
  // --- UI states / filters ---
  const [department, setDepartment] = useState<string>("");
  const [empId, setEmpId] = useState<string>("");
  const [teamLead, setTeamLead] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [showFromPicker, setShowFromPicker] = useState<boolean>(false);
  const [showToPicker, setShowToPicker] = useState<boolean>(false);

  // --- data states ---
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchDone, setSearchDone] = useState<boolean>(false);
  const [totalEmployees, setTotalEmployees] = useState<number>(0);
  const [presentEmployees, setPresentEmployees] = useState<EmployeePresentItem[]>([]);
  const [lateEmployees, setLateEmployees] = useState<EmployeePresentItem[]>([]);
  const [absentEmployees, setAbsentEmployees] = useState<EmployeePresentItem[]>([]);
  const [activeTab, setActiveTab] = useState<"Present" | "Late" | "Absent">("Present");
  const [workModeTab, setWorkModeTab] = useState<"All" | "WFH" | "WFO">("All");
  const [openVisit, setOpenVisit] = useState<Record<string, number | null>>({});
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  // animation
  const bounceAnim = useRef(new Animated.Value(1)).current;

  // local refs for caching fetched data (avoid re-fetching in quick operations)
  const empCache = useRef<any[]>([]);
  const punchCache = useRef<any>(null);
  const sessionCache = useRef<any[]>([]);

  // ---------------- FETCH INITIAL DATA ----------------
  const fetchData = async () => {
    try {
      console.log("fetchData: Starting...");
      // Clear caches to ensure fresh data
      empCache.current = [];
      punchCache.current = null;
      sessionCache.current = [];

      // Employees
      console.log("fetchData: Fetching employees...");
      const empResponse = await fetch(`${API_BASE_URL}/employees/`);
      console.log("fetchData: Employees response:", empResponse.status);
      const empData = await empResponse.json();
      empCache.current = Array.isArray(empData) ? empData : (empData || []);

      // Punch dashboard (present employees)
      console.log("fetchData: Fetching punch dashboard...");
      const punchResponse = await fetch(`${API_BASE_URL}/punchin/dashboard/`);
      console.log("fetchData: Punch dashboard response:", punchResponse.status);
      const punchData = await punchResponse.json();
      punchCache.current = punchData || {};

      // Sessions (client distances)
      console.log("fetchData: Fetching sessions...");
      const sessionResponse = await fetch(`${API_BASE_URL}/site-sessions/`);
      console.log("fetchData: Sessions response:", sessionResponse.status);
      const sessionData = await sessionResponse.json();
      const sessions = (sessionData && sessionData.sessions) || [];
      sessionCache.current = Array.isArray(sessions) ? sessions : [];

      console.log("fetchData: Data fetched, present_employees:", punchCache.current.present_employees?.length);

      // Format present employees if present_employees exists
      if (punchCache.current.present_employees && Array.isArray(punchCache.current.present_employees)) {
        const formattedPresent: EmployeePresentItem[] = punchCache.current.present_employees.map((item: any) => {
          const emp = empCache.current.find((e) => e.emp_id === item.user_id);

          const inTime = item.in_time ? new Date(item.in_time) : null;
          const outTime = item.out_time ? new Date(item.out_time) : null;

          const displayInTime = inTime
            ? inTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
            : "-";
          const displayOutTime = outTime
            ? outTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
            : "-";

          let workingHours = "-";
          if (inTime && outTime) {
            const diffMs = outTime.getTime() - inTime.getTime();
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            workingHours = `${diffHrs}h ${diffMins}m`;
          }

          // Find sessions for that employee on the punch-in date
          const sessionsForDay = sessionCache.current.filter(
            (s: any) =>
              s.user_id === item.user_id &&
              item.in_time &&
              new Date(s.client_login_time).toLocaleDateString("en-IN") ===
              new Date(item.in_time).toLocaleDateString("en-IN")
          );

          // Store all distances (as numbers formatted to 3 decimals)
          const allDistances = sessionsForDay.map((s: any) =>
            Number(s.client_distance_km || 0).toFixed(3)
          );

          return {
            id: item.user_id,
            name: item.user_name || "Unknown",
            department: emp ? emp.department : "N/A",
            role: emp ? emp.role : "Employee",
            punches: [
              {
                inTime: displayInTime,
                outTime: displayOutTime,
                workingHours,
                inDateTime: item.in_time,
                outDateTime: item.out_time,
              },
            ],
            status: "Present",

            // existing fields
            client_distance_km: allDistances.length ? allDistances : ["0.000"],
            client_address:
              sessionsForDay.length > 0
                ? sessionsForDay.map((s: any) => trimAddress(s.client_address || "-"))
                : "-",


            // 👇 safe inline: NO VARIABLE DECLARATION NEEDED
            office_logout_reason:
              sessionsForDay.length > 0
                ? sessionsForDay.map((s: any) => s.office_logout_reason || "-")
                : "-",
          } as EmployeePresentItem;

        });

        // Determine late vs present using same-day office start
        const officeStartTime = new Date();
        officeStartTime.setHours(9, 0, 0, 0);

        const presentList: EmployeePresentItem[] = [];
        const lateList: EmployeePresentItem[] = [];

        formattedPresent.forEach((employee) => {
          const firstPunch = employee.punches[0]?.inDateTime;
          const punchTime = firstPunch ? new Date(firstPunch) : null;

          if (!punchTime) {
            employee.status = "Present";
            presentList.push(employee);
            return;
          }

          if (punchTime < officeStartTime) {
            employee.status = "Present";
            presentList.push(employee);
            return;
          }

          // on or after 9:00 AM -> Late
          employee.status = "Late";
          lateList.push(employee);
          presentList.push(employee); // also show in Present
        });

        // Absent list
        const absentList: EmployeePresentItem[] = empCache.current
          .filter((emp) => !punchCache.current.present_employees.some((p: any) => p.user_id === emp.emp_id))
          .map((emp: any) => ({
            id: emp.emp_id,
            name: emp.name || "Unknown",
            department: emp.department || "N/A",
            role: emp.role || "Employee",
            status: "Absent",
            punches: [],
            client_distance_km: 0,
            client_address: "-",
          }));

        // Update states
        console.log("fetchData: Updating states - present:", presentList.length, "late:", lateList.length, "absent:", absentList.length);
        setPresentEmployees(presentList);
        setLateEmployees(lateList);
        setAbsentEmployees(absentList);
        setTotalEmployees(empCache.current.length);
        setSearchResults([]);
        setSearchDone(false);
        console.log("fetchData: States updated successfully");
      } else {
        // No present_employees node - reset
        setPresentEmployees([]);
        setLateEmployees([]);
        setAbsentEmployees(empCache.current.map((emp: any) => ({
          id: emp.emp_id,
          name: emp.name || "Unknown",
          department: emp.department || "N/A",
          role: emp.role || "Employee",
          status: "Absent",
          punches: [],
          client_distance_km: 0,
          client_address: "-",
        })));
        setTotalEmployees(empCache.current.length);
        setSearchResults([]);
        setSearchDone(false);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", `Failed to fetch data: ${error?.message || 'Unknown error'}. Check console for details.`);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- small touch animation ---
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: 0.95, duration: 150, useNativeDriver: true }),
      Animated.spring(bounceAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
  };

  // --- render tabs helper (keeps original 3-tab behavior) ---
  const renderTabs = () => (
    !searchDone && (
      <View>
        <View style={styles.tabContainer}>
          {["Present", "Late", "Absent"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
              onPress={() => {
                setActiveTab(tab as any);
                setSearchResults([]);
                setSearchDone(false);
              }}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Work Mode Filter Tabs */}
        <View style={styles.workModeTabContainer}>
          {["All", "WFH", "WFO"].map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.workModeTabButton, workModeTab === mode && styles.activeWorkModeTabButton]}
              onPress={() => setWorkModeTab(mode as any)}
            >
              <Text style={[styles.workModeTabText, workModeTab === mode && styles.activeWorkModeTabText]}>
                {mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )
  );

  // --- data to display in FlatList ---
  const getFilteredData = () => {
    let baseData = searchDone
      ? searchResults
      : activeTab === "Present"
        ? presentEmployees
        : activeTab === "Absent"
          ? absentEmployees
          : lateEmployees;

    // Apply work mode filter (only for non-search mode)
    if (!searchDone && workModeTab !== "All") {
      baseData = baseData.filter((employee: any) => {
        const emp = empCache.current.find((e) => e.emp_id === employee.id);
        if (!emp) return false;

        // Determine work mode based on Smart Work Mode Logic
        const hasApprovedWFH = emp.approved_wfh_today;
        const workMode = emp.employment_type === "WFH" || hasApprovedWFH ? "WFH" : "WFO";

        return workModeTab === "WFH" ? workMode === "WFH" : workMode === "WFO";
      });
    }

    return baseData;
  };

  const dataToShow = getFilteredData();


  // --------------------- UPDATED DATE FILTER SEARCH ---------------------
  const handleSearch = async () => {
    try {
      if (!fromDate && !toDate && !empId.trim() && !teamLead.trim() && !department.trim()) {
        Alert.alert("Validation", "Please select at least one filter before searching.");
        return;
      }

      // Use cached employees if available
      const empData = empCache.current.length ? empCache.current : (await (await fetch(`${API_BASE_URL}/employees/`)).json());
      const punchResponse = await fetch(`${API_BASE_URL}/punch_records/`);
      const punchData = await punchResponse.json();
      const sessionResponse = await fetch(`${API_BASE_URL}/site-sessions/`);
      const sessionData = await sessionResponse.json();
      const sessions = (sessionData && sessionData.sessions) || [];

      // Build base employee list
      let allEmployees = (empData || []).map((emp: any) => ({
        id: emp.emp_id,
        name: emp.name || "Unknown",
        role: emp.role || "Employee",
        department: emp.department || "N/A",
        punches: [],
        client_distance_km: 0,
      }));

      let punchRecords = (punchData && punchData.employees) || [];

      // Apply date range filter if provided
      if (fromDate && toDate) {
        const start = new Date(fromDate);
        const end = new Date(toDate);
        // include entire end day by setting time to 23:59:59
        end.setHours(23, 59, 59, 999);

        punchRecords = punchRecords.map((emp: any) => {
          const filteredPunches = emp.punches.filter((p: any) => {
            const punchDate = new Date(p.time);
            return punchDate >= start && punchDate <= end;
          });
          return { ...emp, punches: filteredPunches };
        });
      }

      // Merge punches into employee list and group by date
      const mergedResults = allEmployees.map((emp: any) => {
        const match = punchRecords.find((p: any) => String(p.id) === String(emp.id));
        const punches = match ? match.punches : [];

        // Group by date
        const grouped: any = {};
        punches.forEach((p: any) => {
          const dateKey = new Date(p.time).toLocaleDateString("en-IN");
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(p);
        });

        const punchesByDate = Object.keys(grouped).map((date) => {
          // compute client distances & address for that day using sessions
          const sessionsForDay = sessions.filter(
            (s: any) =>
              String(s.user_id) === String(emp.id) &&
              new Date(s.client_login_time).toLocaleDateString("en-IN") === date
          );

          const distances = sessionsForDay.map((s: any) => Number(s.client_distance_km || 0));
          const total = distances.length ? distances.reduce((a: number, b: number) => a + b, 0) : 0;

          return {
            date,
            punches: grouped[date].map((p: any) => {
              return {
                inTime:
                  p.type === "in"
                    ? new Date(p.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                    : "-",
                outTime:
                  p.type === "out"
                    ? new Date(p.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                    : "-",
                inDateTime: p.time,
                time: p.time,
                type: p.type,
                server_timestamp_ist: p.server_timestamp_ist,
              };
            }),
            client_distance_km: {
              distances: distances.map((d: number) => d.toFixed(3)),
              total: total.toFixed(3),
            },
            client_address: sessionsForDay.map((s: any) => trimAddress(s.client_address || "-")),
            office_logout_reason: sessionsForDay.map((s: any) => s.office_logout_reason || "-"),
          };
        });

        return {
          ...emp,
          punchesByDate,
          status: punches.length > 0 ? "Present" : "Absent",
        };
      });

      // classify present / late / absent
      const officeCutoff = new Date();
      officeCutoff.setHours(9, 0, 0, 0);

      const presentList: any[] = [];
      const lateList: any[] = [];
      const absentList: any[] = [];

      mergedResults.forEach((emp: any) => {
        if (!emp.punchesByDate || emp.punchesByDate.length === 0) {
          absentList.push({ ...emp, status: "Absent" });
          return;
        }

        const firstPunchRaw =
          emp.punchesByDate[0]?.punches[0]?.server_timestamp_ist ||
          emp.punchesByDate[0]?.punches[0]?.inDateTime ||
          emp.punchesByDate[0]?.punches[0]?.time;

        if (!firstPunchRaw) {
          absentList.push({ ...emp, status: "Absent" });
          return;
        }

        const punchTime = new Date(firstPunchRaw);

        if (punchTime < officeCutoff) {
          presentList.push({ ...emp, status: "Present" });
          return;
        }

        // after or equal to cutoff -> late
        lateList.push({ ...emp, status: "Late" });
        presentList.push({ ...emp, status: "Late" });
      });

      // Apply search filters: empId, teamLead (role), department
      let filteredResults = [...presentList, ...lateList, ...absentList];

      if (empId.trim()) {
        filteredResults = filteredResults.filter((emp) =>
          String(emp.id).toLowerCase().includes(empId.toLowerCase())
        );
      }
      if (teamLead.trim()) {
        filteredResults = filteredResults.filter((emp) =>
          (emp.role || "").toLowerCase().includes(teamLead.toLowerCase())
        );
      }
      if (department.trim()) {
        filteredResults = filteredResults.filter(
          (emp) => (emp.department || "").toLowerCase() === department.toLowerCase()
        );
      }

      setPresentEmployees(presentList);
      setLateEmployees(lateList);
      setAbsentEmployees(absentList);
      setSearchResults(filteredResults);
      setSearchDone(true);
    } catch (error) {
      console.error("Error fetching punch records:", error);
      Alert.alert("Error", "Failed to fetch punch records. Check console.");
    }
  };

  const handleClearFilters = () => {
    setDepartment("");
    setEmpId("");
    setTeamLead("");
    setFromDate("");
    setToDate("");
    setSearchResults([]);
    setSearchDone(false);
  };

  // --------------------- EXCEL DOWNLOAD ---------------------
  const downloadExcel = async () => {
    try {
      if (!searchDone || searchResults.length === 0) {
        Alert.alert("No Data", "No search results to download.");
        return;
      }

      if (!department) {
        Alert.alert("Select Department", "Please select a department before downloading.");
        return;
      }

      const safeDepartment = String(department).trim() || "Employee";
      const fileName = `${safeDepartment}_Employee_Report_${new Date().toISOString().split("T")[0]}.xlsx`;

      // Build API URL with export_excel=true and date range
      let apiUrl = `${API_BASE_URL}/punch_records/?export_excel=true`;

      if (fromDate) apiUrl += `&from_date=${fromDate}`;
      if (toDate) apiUrl += `&to_date=${toDate}`;

      // Fetch Excel data from backend
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      // Get the Excel file as blob/arraybuffer
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Convert to base64 for FileSystem
      let binary = '';
      uint8Array.forEach(byte => binary += String.fromCharCode(byte));
      const wbout = btoa(binary);

      const fileUri = FileSystem.cacheDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Try Android SAF (StorageAccessFramework) first
      if (Platform.OS === "android" && FileSystem.StorageAccessFramework) {
        try {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const newFile = await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              fileName,
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );
            await FileSystem.StorageAccessFramework.writeAsStringAsync(newFile, wbout, {
              encoding: FileSystem.EncodingType.Base64,
            });
            Alert.alert("Saved", `Saved to Downloads as ${fileName}`);
            return;
          }
        } catch (err) {
          console.warn("SAF error, falling back to share:", err);
        }
      }

      // Fallback: use Sharing (works on iOS / web fallback)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", dialogTitle: `Share ${fileName}` });
        return;
      }

      Alert.alert("Saved", `Excel exported to cache: ${fileUri}`);
    } catch (error) {
      console.error("Excel download error:", error);
      Alert.alert("Error", "Failed to generate Excel. See console for details.");
    }
  };

  // --- Small UI pieces ---
  const Card = ({ title, value, icon }: any) => (
    <Animated.View style={[styles.card, { transform: [{ scale: bounceAnim }] }]}>
      <TouchableOpacity activeOpacity={0.8} onPress={handlePress}>
        <Ionicons name={icon} size={28} color="#fff" />
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value}</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const getDeptColor = (dept?: string) => {
    switch ((dept || "").toLowerCase()) {
      case "software":
        return "#42a5f5";
      case "hardware":
        return "#ff9800";
      case "digitaldesign":
        return "#e91e63";
      default:
        return "#9e9e9e";
    }
  };

  return (
    <LinearGradient colors={["#ec407a", "#641b9a"]} style={styles.container}>
      <FlatList
        data={dataToShow}
        keyExtractor={(item, index) => `${item.id}-${searchDone ? 'search' : activeTab}-${index}`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              console.log("Pull-to-refresh triggered - resetting filters and refreshing data");
              
              // Clear all filter values
              setDepartment("");
              setEmpId("");
              setTeamLead("");
              setFromDate("");
              setToDate("");
              setSearchResults([]);
              setSearchDone(false);
              
              // Reset active tab to Present and work mode to All
              setActiveTab("Present");
              setWorkModeTab("All");
              
              // Clear open visits
              setOpenVisit({});
              
              // Refresh data with default values
              setRefreshing(true);
              await fetchData();
              setRefreshing(false);
              Alert.alert("Success", "Dashboard data refreshed with default filters");
            }}
            tintColor="#fff"
            title="Refreshing..."
            titleColor="#fff"
            colors={["#fff", "#ec407a", "#641b9a"]}
            progressBackgroundColor="#ec407a"
          />
        }
        ListHeaderComponent={
          <>
            {/* FILTERS */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Filters</Text>

              {/* Department */}
              <Picker
                selectedValue={department}
                onValueChange={(itemValue) => setDepartment(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Select Department" value="" />
                <Picker.Item label="Software" value="Software" />
                <Picker.Item label="Hardware" value="Hardware" />
                <Picker.Item label="DigitalDesign" value="DigitalDesign" />
              </Picker>

              {/* Employee ID */}
              <TextInput
                placeholder="Employee ID"
                placeholderTextColor="#ddd"
                value={empId}
                onChangeText={setEmpId}
                style={styles.input}
              />

              {/* From Date */}
              <TouchableOpacity style={styles.input} onPress={() => setShowFromPicker(true)}>
                <Text style={{ color: "#fff" }}>
                  {fromDate ? `From: ${fromDate}` : "Select From Date"}
                </Text>
              </TouchableOpacity>

              {showFromPicker && (
                <DateTimePicker
                  value={fromDate ? new Date(fromDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowFromPicker(false);
                    if (selectedDate) {
                      const iso = selectedDate.toISOString().split("T")[0];
                      setFromDate(iso);
                    }
                  }}
                />
              )}

              {/* To Date */}
              <TouchableOpacity style={styles.input} onPress={() => setShowToPicker(true)}>
                <Text style={{ color: "#fff" }}>
                  {toDate ? `To: ${toDate}` : "Select To Date"}
                </Text>
              </TouchableOpacity>

              {showToPicker && (
                <DateTimePicker
                  value={toDate ? new Date(toDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowToPicker(false);
                    if (selectedDate) {
                      const iso = selectedDate.toISOString().split("T")[0];
                      setToDate(iso);
                    }
                  }}
                />
              )}

              {/* Buttons */}
              <View style={styles.filterButtons}>
                <TouchableOpacity style={styles.button} onPress={handleSearch}>
                  <Text style={styles.buttonText}>Search</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.refreshButton} 
                  onPress={async () => {
                    console.log("Refresh button clicked - resetting filters and refreshing data");
                    
                    // Clear all filter values
                    setDepartment("");
                    setEmpId("");
                    setTeamLead("");
                    setFromDate("");
                    setToDate("");
                    setSearchResults([]);
                    setSearchDone(false);
                    
                    // Reset active tab to Present and work mode to All
                    setActiveTab("Present");
                    setWorkModeTab("All");
                    
                    // Clear open visits
                    setOpenVisit({});
                    
                    // Refresh data with default values
                    setIsReloading(true);
                    await fetchData();
                    setIsReloading(false);
                    Alert.alert("Success", "Dashboard data refreshed with default filters");
                  }}
                  disabled={isReloading}
                >
                  <Text style={styles.buttonText}>
                    {isReloading ? "Loading..." : "🔄 Refresh Data"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.refreshButton, { backgroundColor: "rgba(255,255,255,0.3)" }]}
                  onPress={handleClearFilters}
                >
                  <Text style={styles.buttonText}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* STATS */}
            {!searchDone && (
              <View style={styles.statsSection}>
                <Card title="Total Employees" value={totalEmployees} icon="people" />
                <Card title="Present" value={presentEmployees.length} icon="person" />
                <Card title="Absent" value={absentEmployees.length} icon="person-remove" />
              </View>
            )}

            {/* Excel Download button */}
            {searchDone && (
              <>
                <Text style={styles.sectionTitle}>Search Results</Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: "rgba(255,255,255,0.3)",
                    padding: 12,
                    borderRadius: 20,
                    alignSelf: "center",
                    marginBottom: 10,
                    marginTop: -5,
                  }}
                  onPress={downloadExcel}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                    ⬇️ Download Excel
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {renderTabs()}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={styles.listRow}>
              <Text style={styles.listText}>
                {item.name} ({item.id})
              </Text>

              {!searchDone && (
                <View style={[styles.badge, { backgroundColor: getDeptColor(item.department) }]}>
                  <Text style={styles.badgeText}>{item.department}</Text>
                </View>
              )}
            </View>

            {/* Show Late Badge in non-search mode */}
            {!searchDone && item.status === "Late" && (
              <Text
                style={{
                  color: "orange",
                  fontWeight: "bold",
                  marginTop: 5,
                  fontSize: 14,
                }}
              >
                ⏰ Late
              </Text>
            )}

            {/* Search results mode → punchesByDate */}
            {searchDone
              ? item.punchesByDate?.map((day: any, idx: number) => (
                <View key={idx} style={{ marginTop: 8 }}>
                  <Text style={[styles.listSubText, { fontWeight: "bold" }]}>{day.date}</Text>

                  {day.punches.map((p: any, i: number) => (
                    <View key={i} style={styles.punchRow}>
                      <Text style={styles.listSubText}>In Time: {p.inTime}</Text>
                      <Text style={styles.listSubText}>Out Time: {p.outTime}</Text>
                      {/* SITE DISTANCES (array) */}
                      {day.client_distance_km?.distances?.length > 0 && (
                        <Text style={[styles.listSubText, { marginTop: 4 }]}>
                          Site Distance(s): {day.client_distance_km.distances.join(" km, ")} km
                        </Text>
                      )}

                      {/* TOTAL */}
                      {day.client_distance_km?.total && (
                        <Text style={[styles.listSubText, { fontWeight: "bold", color: "#00e676", marginTop: 3 }]}>
                          Total Distance: {day.client_distance_km.total} km
                        </Text>
                      )}
                    </View>
                  ))}

                  {/* VISITS BLOCK - TODAY SUMMARY */}
                  {Array.isArray(item.client_distance_km) &&
                    Array.isArray(item.office_logout_reason) &&
                    Array.isArray(item.client_address) && (
                      <View style={{ marginTop: 12 }}>

                        {item.client_distance_km.map((dist: string, i: number) => {
                          const isOpen = openVisit[item.id] === i;

                          return (
                            <View
                              key={i}
                              style={{
                                marginBottom: 12,
                                borderBottomWidth: 1,
                                borderColor: "rgba(255,255,255,0.15)",
                                paddingVertical: 6,
                              }}
                            >
                              {/* HEADER */}
                              <TouchableOpacity
                                onPress={() =>
                                  setOpenVisit((prev) => ({
                                    ...prev,
                                    [item.id]: isOpen ? null : i,
                                  }))
                                }
                                style={{ flexDirection: "row", justifyContent: "space-between" }}
                              >
                                <Text
                                  style={[
                                    styles.listSubText,
                                    { fontWeight: "bold", color: "#ffe600", marginBottom: 4 },
                                  ]}
                                >
                                  VISIT {i + 1}
                                </Text>
                                <Text style={[styles.listSubText, { color: "#fff" }]}>
                                  {isOpen ? "▲" : "▼"}
                                </Text>
                              </TouchableOpacity>

                              {/* BODY */}
                              {isOpen && (
                                <View style={{ marginTop: 5 }}>
                                  <Text style={styles.listSubText}>
                                    Site Distance: {dist} km
                                  </Text>
                                  <Text style={styles.listSubText}>
                                    Reason: {item.office_logout_reason?.[i] || "-"}
                                  </Text>
                                  <Text style={styles.listSubText}>
                                    Client Address: {trimAddress(item.client_address?.[i] || "-")}
                                  </Text>
                                </View>
                              )}
                            </View>
                          );
                        })}

                        {/* 👇 TOTAL UNDER LAST VISIT */}
                        <Text
                          style={[
                            styles.listSubText,
                            { fontWeight: "bold", color: "#00e676", marginTop: 10 },
                          ]}
                        >
                          Total Site Distance:{" "}
                          {item.client_distance_km
                            .reduce((sum: number, v: any) => sum + parseFloat(v), 0)
                            .toFixed(3)}{" "}
                          km
                        </Text>

                      </View>
                    )}
                </View>
              ))


              : /* Non-search mode → Today's punches summary */
              item.punches?.map((p: any, idx: number) => {
                // Determine work mode for this employee
                const emp = empCache.current.find((e) => e.emp_id === item.id);
                const hasApprovedWFH = emp?.approved_wfh_today;
                const workMode = emp?.employment_type === "WFH" || hasApprovedWFH ? "WFH" : "WFO";

                return (
                  <View key={idx} style={{ marginTop: 6 }}>

                    {/* SAME LINE — In / Out */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={styles.listSubText}>In Time: {p.inTime}</Text>
                      <Text style={styles.listSubText}>Out Time: {p.outTime}</Text>
                    </View>

                    {/* NEXT LINE — Working Hours & Work Mode */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                      <Text style={styles.listSubText}>Working Hours: {p.workingHours}</Text>
                      <Text style={[styles.listSubText, {
                        color: workMode === "WFH" ? "#a855f7" : "#3b82f6",
                        fontWeight: "bold"
                      }]}>
                        Work Mode: {workMode}
                      </Text>
                    </View>

                  {/* VISITS BLOCK - TODAY SUMMARY */}
                  {Array.isArray(item.client_distance_km) &&
                    Array.isArray(item.office_logout_reason) &&
                    Array.isArray(item.client_address) && (
                      <View style={{ marginTop: 12 }}>
                        {item.client_distance_km.map((dist: string, i: number) => {
                          const isOpen = openVisit[item.id] === i;

                          return (
                            <View
                              key={i}
                              style={{
                                marginBottom: 12,
                                borderBottomWidth: 1,
                                borderColor: "rgba(255,255,255,0.15)",
                                paddingVertical: 6,
                              }}
                            >
                              {/* HEADER - clickable */}
                              <TouchableOpacity
                                onPress={() => {
                                  setOpenVisit((prev) => ({
                                    ...prev,
                                    [item.id]: isOpen ? null : i,
                                  }));
                                }}
                                style={{ flexDirection: "row", justifyContent: "space-between" }}
                              >

                                <Text
                                  style={[
                                    styles.listSubText,
                                    { fontWeight: "bold", color: "#ffe600", marginBottom: 4 },
                                  ]}
                                >
                                  VISIT {i + 1}
                                </Text>

                                <Text style={[styles.listSubText, { color: "#fff" }]}>
                                  {isOpen ? "▲" : "▼"}
                                </Text>
                              </TouchableOpacity>

                              {/* BODY - visible only when open */}
                              {isOpen && (
                                <View style={{ marginTop: 5 }}>
                                  <Text style={styles.listSubText}>
                                    Site Distance: {dist} km
                                  </Text>

                                  <Text style={styles.listSubText}>
                                    Reason: {item.office_logout_reason?.[i] || "-"}
                                  </Text>

                                  <Text style={styles.listSubText}>
                                    Client Address: {trimAddress(item.client_address?.[i] || "-")}
                                  </Text>
                                </View>
                              )}
                            </View>
                          );
                        })}

                      </View>
                    )}


                  {/* 👇 TOTAL DISTANCE (always visible after last visit) */}
                  <Text
                    style={[
                      styles.listSubText,
                      { fontWeight: "bold", color: "#00e676", marginTop: 10 },
                    ]}
                  >
                    Total Site Distance:{" "}
                    {item.client_distance_km
                      .reduce((sum: number, v: any) => sum + parseFloat(v), 0)
                      .toFixed(3)}{" "}
                    km
                  </Text>
                </View>
              );
              })}

            {!searchDone && <Text style={styles.listSubText}>Role: {item.role}</Text>}

            {!searchDone && (
              <Text
                style={[
                  styles.listSubText,
                  { color: item.status === "Absent" ? "#FF5252" : "#25D366" },
                ]}
              >
                Status: {item.status}
              </Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: "#fff", textAlign: "center", marginTop: 20 }}>
            {searchDone
              ? "No employees found for your requirements"
              : `No ${activeTab.toLowerCase()} employees found.`}
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  filterSection: { marginBottom: 20, paddingHorizontal: 16 },
  filterTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  picker: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 15,
    marginVertical: 8,
    color: "#fff",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 15,
    padding: 15,
    marginVertical: 8,
    color: "#fff",
  },
  filterButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
    flexWrap: "wrap",
  },
  button: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 12,
    borderRadius: 20,
    minWidth: 100,
    alignItems: "center",
    marginVertical: 5,
  },
  refreshButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 12,
    borderRadius: 20,
    minWidth: 100,
    alignItems: "center",
    marginVertical: 5,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  statsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  card: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 20,
    margin: 8,
    alignItems: "center",
  },
  cardTitle: { fontSize: 16, color: "#fff", fontWeight: "bold", marginTop: 8, textAlign: "center" },
  cardValue: { fontSize: 24, color: "#fff", fontWeight: "bold", textAlign: "center" },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
  },

  listItem: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 15,
    borderRadius: 15,
    marginVertical: 6,
    marginHorizontal: 16,
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },
  listText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  listSubText: { color: "#ddd", fontSize: 14, marginTop: 5 },

  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeText: { color: "#fff", fontWeight: "bold" },

  tabContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  tabButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 15,
  },
  activeTabButton: { backgroundColor: "rgba(255,255,255,0.4)" },
  tabText: { color: "#fff", fontWeight: "bold" },
  activeTabText: { fontSize: 16 },

  punchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 3,
    flexWrap: "wrap",
  },
  workModeTabContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
  workModeTabButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 3,
    borderRadius: 12,
  },
  activeWorkModeTabButton: { backgroundColor: "rgba(255,255,255,0.4)" },
  workModeTabText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  activeWorkModeTabText: { color: "#ffe600" },
});

export default DashboardScreen;
