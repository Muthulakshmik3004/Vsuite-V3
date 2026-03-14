import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import API_BASE_URL from "../../config";

type Filters = {
  complaint_no: string;
  customer_name: string;
  product_name: string;
  staff_name: string;
  status: string;
  from_date: string;
  to_date: string;
};

type ExportRow = {
  complaint_no: string;
  customer_name: string;
  product_name: string;
  assigned_emp_name: string;
  status: string;
};

const [filters, setFilters] = useState<Filters>({
  complaint_no: "",
  customer_name: "",
  product_name: "",
  staff_name: "",
  status: "all",
  from_date: "",
  to_date: "",
});

/* ===== UI CONSTANTS ===== */
const COLORS = {
  background: "#6addf7ff",
  header: "#12b5d9ff",
  surface: "#ffffff",
  primary: "#007bff",
  success: "#2ecc71",
  danger: "#e74c3c",
  warning: "#f39c12",
  textPrimary: "#000",
  textSecondary: "#555",
};

const RADIUS = 16;

export default function ExportScreen() {
  const [filters, setFilters] = useState({
    complaint_no: "",
    customer_name: "",
    product_name: "",
    staff_name: "",
    status: "all",
    from_date: "",
    to_date: "",
  });

  const [results, setResults] = useState<ExportRow[]>([]);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const update = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      complaint_no: "",
      customer_name: "",
      product_name: "",
      staff_name: "",
      status: "all",
      from_date: "",
      to_date: "",
    });
    setResults([]);
  };

  /* ===== DATE HANDLERS ===== */
  const onFromDateChange = (
    event: any,
    selectedDate?: Date
  ) => {
    setShowFromPicker(false);
    if (selectedDate) {
      setFilters((prev) => ({
        ...prev,
        from_date: selectedDate.toISOString().split("T")[0],
      }));
    }
  };

  const onToDateChange = (
    event: any,
    selectedDate?: Date
  ) => {
    setShowToPicker(false);
    if (selectedDate) {
      setFilters((prev) => ({
        ...prev,
        to_date: selectedDate.toISOString().split("T")[0],
      }));
    }
  };

  const handleSearch = async () => {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v !== "all") params.append(k, v);
    });

    const url = `${API_BASE_URL}/api/user/bookservice/?${params.toString()}`;

    console.log("Search URL:", url); // 👈 Add this

    const res = await axios.get(url);

    console.log("Response:", res.data); // 👈 Add this

    setResults(res.data || []);
  } catch (error: any) {
    console.log("Search Error:", error.response?.data || error.message);
    alert("Search Failed");
  }
};

  const handleExport = async () => {
    try {
      const fileUri = FileSystem.documentDirectory + "complaints.xlsx";

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== "all") params.append(k, v);
      });

      const result = await FileSystem.downloadAsync(
        `${API_BASE_URL}/api/user/bookservice/export/?${params.toString()}`,
        fileUri
      );

      await Sharing.shareAsync(result.uri);
    } catch {
      alert("Export Failed");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* HEADER */}
        <View style={styles.headerCard}>
          <Text style={styles.header}>Export Complaints</Text>
          <Text style={styles.subHeader}>
            Filter • Search • Export Excel
          </Text>
        </View>

        {/* FILTER CARD */}
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Complaint Number"
            value={filters.complaint_no}
            onChangeText={(t) => update("complaint_no", t)}
          />

          <TextInput
            style={styles.input}
            placeholder="Customer Name"
            value={filters.customer_name}
            onChangeText={(t) => update("customer_name", t)}
          />

          <TextInput
            style={styles.input}
            placeholder="Product"
            value={filters.product_name}
            onChangeText={(t) => update("product_name", t)}
          />

          <TextInput
            style={styles.input}
            placeholder="Staff Name"
            value={filters.staff_name}
            onChangeText={(t) => update("staff_name", t)}
          />

          {/* STATUS */}
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusRow}>
            {["all", "pending", "completed"].map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusBtn,
                  filters.status === s && styles.statusActive,
                ]}
                onPress={() => update("status", s)}
              >
                <Text
                  style={[
                    styles.statusText,
                    filters.status === s && styles.statusActiveText,
                  ]}
                >
                  {s.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* DATES */}
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowFromPicker(true)}
          >
            <Feather name="calendar" size={16} />
            <Text style={styles.dateText}>
              {filters.from_date || "From Date"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowToPicker(true)}
          >
            <Feather name="calendar" size={16} />
            <Text style={styles.dateText}>
              {filters.to_date || "To Date"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* BUTTONS */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={handleSearch}
          >
            <Feather name="search" size={18} color="#fff" />
            <Text style={styles.btnText}>Search</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExport}
          >
            <Feather name="download" size={18} color="#fff" />
            <Text style={styles.btnText}>Export</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.clearBtn}
          onPress={clearFilters}
        >
          <Feather name="trash-2" size={18} color="#fff" />
          <Text style={styles.btnText}>Clear Filters</Text>
        </TouchableOpacity>

        {/* RESULTS */}
        {results.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Search Results</Text>
            {results.map((item, i) => (
              <View key={i} style={styles.resultCard}>
                <Text>
                  <Text style={styles.bold}>Complaint:</Text>{" "}
                  {item.complaint_no}
                </Text>
                <Text>
                  <Text style={styles.bold}>Customer:</Text>{" "}
                  {item.customer_name}
                </Text>
                <Text>
                  <Text style={styles.bold}>Product:</Text>{" "}
                  {item.product_name || "N/A"}
                </Text>
                <Text>
                  <Text style={styles.bold}>Staff:</Text>{" "}
                  {item.assigned_emp_name || "N/A"}
                </Text>
                <Text>
                  <Text style={styles.bold}>Status:</Text>{" "}
                  {item.status}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* FROM DATE PICKER */}
        {showFromPicker && (
          <DateTimePicker
            value={
              filters.from_date
                ? new Date(filters.from_date)
                : new Date()
            }
            mode="date"
            display="default"
            onChange={onFromDateChange}
          />
        )}

        {/* TO DATE PICKER */}
        {showToPicker && (
          <DateTimePicker
            value={
              filters.to_date
                ? new Date(filters.to_date)
                : new Date()
            }
            mode="date"
            display="default"
            onChange={onToDateChange}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#6addf7ff",
  },

  headerCard: {
    backgroundColor: "#12b5d9ff",
    padding: 18,
    borderRadius: 18,
    marginBottom: 16,
  },

  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },

  subHeader: {
    color: "#eaf8fc",
    marginTop: 4,
    fontSize: 13,
  },

  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 18,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },

  input: {
    backgroundColor: "#f2f6f9",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#000",
    marginBottom: 12,
  },

  sectionTitle: {
    fontWeight: "bold",
    marginVertical: 10,
    color: "#333",
  },

  statusRow: {
    flexDirection: "row",
    marginBottom: 10,
  },

  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#12b5d9ff",
    marginHorizontal: 4,
    alignItems: "center",
  },

  statusActive: {
    backgroundColor: "#12b5d9ff",
  },

  statusText: {
    color: "#12b5d9ff",
    fontWeight: "600",
  },

  statusActiveText: {
    color: "#fff",
  },

  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f6f9",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  dateText: {
    marginLeft: 8,
    color: "#555",
  },

  buttonRow: {
    flexDirection: "row",
    marginBottom: 12,
  },

  searchBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#007bff",
    padding: 14,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },

  exportBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#2ecc71",
    padding: 14,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },

  clearBtn: {
    flexDirection: "row",
    backgroundColor: "#eb5968ff",
    padding: 14,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
  },

  resultCard: {
    backgroundColor: "#f7f9fc",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },

  bold: {
    fontWeight: "bold",
  },
});
