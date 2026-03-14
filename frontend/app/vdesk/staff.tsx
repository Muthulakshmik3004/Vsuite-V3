import React, { useState, useCallback, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import axios from "axios";
import API_BASE_URL from "../../config";

const COLORS = {
  background: "#6addf7ff",
  header: "#12b5d9ff",
  panel: "#b2ebf2",
  surface: "#9ad7ecff",
  primary: "#007bff",
  accent: "#2694a8ff",
  success: "#399a43ff",
  danger: "#eb5968ff",
  textPrimary: "#000000",
  textSecondary: "#555555",
  muted: "#777777",
  white: "#ffffff",
};

const SIZES = {
  radius: 16,
  padding: 16,
  h1: 30,
  h2: 22,
  h3: 18,
  body: 14,
};

export default function HardwareEmployees() {
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [removedEmployees, setRemovedEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);

  // useFocusEffect(
  //   useCallback(() => {
  //     fetchData();
  //   }, [])
  // );
  // useEffect(() => {
  //   fetchData();
  // }, [fetchData]);



const fetchData = useCallback(async () => {
  try {
    setLoading(true);

    const [activeRes, removedRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/api/user/hardware-employees/`),
      axios.get(`${API_BASE_URL}/api/user/hardware-removed-users/`),
    ]);

    setActiveEmployees(activeRes.data ?? []);
    setRemovedEmployees(removedRes.data ?? []);
  } catch (error) {
    console.error("❌ Failed to fetch hardware employees:", error);
  } finally {
    setLoading(false);
  }
}, []);

useFocusEffect(
  useCallback(() => {
    fetchData();
  }, [fetchData])
);


  const handleDelete = async (empId) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/user/hardware-delete/${empId}/`);
      fetchData();
    } catch (error) {
      console.error("Failed to delete employee", error.message);
    }
  };

  // const handleRestore = async (empId) => {
  //   try {
  //     await axios.post(`${API_BASE_URL}/api/user/restore-hardware-employee/${empId}/`);
  //     fetchData();
  //   } catch (error) {
  //     console.error("Failed to restore employee", error.message);
  //   }
  // };

  const renderInfoRow = (icon, label, value) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Feather name={icon} size={16} color={COLORS.accent} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  const renderCard = ({ item }) => {
    const isExpanded = expandedId === item.emp_id;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setExpandedId(isExpanded ? null : item.emp_id)}
      >
        {/* <Image
          source={
            item.photo_url
              ? { uri: item.photo_url }
              : require("../../assets/avatar.png")
          }
          style={styles.profilePhoto}
        /> */}
        <View style={styles.nameRow}>
          <Feather name="user" size={20} color={COLORS.primary} />
          <Text style={styles.name}>{item.name}</Text>
        </View>
        {isExpanded && (
          <View style={styles.cardContent}>
            {renderInfoRow("user", "Name", item.name)}
            {renderInfoRow("mail", "Email", item.email || "N/A")}
            {renderInfoRow("hash", "Emp ID", item.emp_id)}
            {renderInfoRow("phone", "Phone", item.phone || "N/A")}
            {item.removed_by && renderInfoRow("user-x", "Removed By", item.removed_by)}

          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10 }}>Loading hardware employees...</Text>
      </View>
    );
  }

  const dataToShow = showDeleted ? removedEmployees : activeEmployees;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Hardware Employees</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterCard, !showDeleted && styles.filterCardActive]}
            onPress={() => setShowDeleted(false)}
          >
            <Feather name="users" size={20} color={COLORS.white} />
            <Text style={styles.filterLabel}>Active</Text>
            <Text style={styles.filterCount}>{activeEmployees.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterCard, showDeleted && styles.filterCardActive]}
            onPress={() => setShowDeleted(true)}
          >
            <Feather name="trash-2" size={20} color={COLORS.white} />
            <Text style={styles.filterLabel}>Removed</Text>
            <Text style={styles.filterCount}>{removedEmployees.length}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {dataToShow.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={showDeleted ? "trash-outline" : "people-outline"}
            size={64}
            color={COLORS.white}
          />
          <Text style={styles.emptyText}>
            {showDeleted ? "No removed employees" : "No active employees"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={dataToShow}
          keyExtractor={(item) => item.emp_id}
          renderItem={renderCard}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSection: {
    backgroundColor: COLORS.header,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginVertical: 16,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: SIZES.h2,
    fontWeight: "bold",
    color: COLORS.white,
  },
  filterRow: {
    flexDirection: "row",
    marginTop: 12,
    justifyContent: "space-between",
  },
  filterCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    marginHorizontal: 6,
    padding: 12,
    alignItems: "center",
  },
  filterCardActive: {
    backgroundColor: COLORS.accent,
  },
  filterLabel: {
    color: COLORS.white,
    marginTop: 4,
    fontWeight: "bold",
  },
  filterCount: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 16,
    marginVertical: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: SIZES.h3,
    fontWeight: "bold",
    color: COLORS.primary,
    marginLeft: 8,
  },
  cardContent: {
    width: "100%",
    marginTop: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  infoIcon: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  infoLabel: {
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginLeft: 8,
    width: 100,
    fontSize: 14,
  },
  infoValue: {
    color: COLORS.textPrimary,
    flex: 1,
    fontSize: 14,
  },
  actionsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 10,
    borderRadius: SIZES.radius,
    marginHorizontal: 4,
  },
  deleteBtn: { backgroundColor: COLORS.danger },
  restoreBtn: { backgroundColor: COLORS.success },
  actionText: {
    color: COLORS.white,
    fontWeight: "600",
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 80,
  },
  emptyText: {
    color: COLORS.white,
    fontSize: SIZES.h3,
    fontWeight: "600",
    marginTop: 12,
  },
});
