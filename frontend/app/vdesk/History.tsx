import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TextInput, SafeAreaView, StatusBar } from "react-native";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import API_BASE_URL from "../../config";
import AnimatedOrbs from "../../components/AnimatedOrbs";

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
  border: "#e0f2f1",
  white: "#ffffff",
};

const SIZES = {
  radius: 16,
  padding: 20,
  h1: 30,
  h2: 22,
  h3: 18,
  body: 14,
};

export default function History() {
  const [completedComplaints, setCompletedComplaints] = useState<any[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCompletedComplaints();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString.replace(/\+00:00$/, "Z"));
    return date.toLocaleString();
  };

  const fetchCompletedComplaints = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/user/complaints/`);
      const completed = Array.isArray(res.data)
        ? res.data.filter((c) => c.status?.toLowerCase() === "completed")
        : [];
      setCompletedComplaints(completed);
      setFilteredComplaints(completed);
    } catch (err) {
      console.error(err);
      // Failed to load history
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === "") {
      setFilteredComplaints(completedComplaints);
      return;
    }

    const lowerText = text.toLowerCase();
    const filtered = completedComplaints.filter((item) => {
      const appliedDate = formatDate(
        item.date_created || item.created_at || null
      ).toLowerCase();

      return (
        [
          item.complaint_no,
          item.customer_name,
          item.customer_phone,
          item.details,
          item.payment_method,
          item.remarks,
          item.assigned_staff,
          appliedDate,
        ]
          .join(" ")
          .toLowerCase()
          .includes(lowerText)
      );
    });

    setFilteredComplaints(filtered);
  };

  const renderInfoRow = (icon: any, label: string, value: string) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Feather name={icon} size={16} color={COLORS.accent} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: COLORS.success }]}>
          <Feather name="check" size={14} color={COLORS.white} />
          <Text style={styles.statusText}>Completed</Text>
        </View>
        <Text style={styles.cardTitle}>{item.complaint_no}</Text>
      </View>

      {renderInfoRow("user", "Customer", item.customer_name)}
      {renderInfoRow("mail", "Email", item.customer_email || "No email")}
      {renderInfoRow("package", "Product", item.product_name || item.product_id || "-")}
      {renderInfoRow("alert-circle", "Issue", item.details)}
      {renderInfoRow("credit-card", "Payment", item.payment_method || "N/A")}
      {renderInfoRow("message-square", "Remarks", item.remarks || "No remarks")}

      <View style={styles.dateSection}>
        <Feather name="calendar" size={16} color={COLORS.muted} style={styles.dateIcon} />
        <Text style={styles.dateText}>
          Completed on {formatDate(item.date_created || item.created_at || null)}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AnimatedOrbs count={18} />
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Service History</Text>
        <Text style={styles.headerSubtitle}>Completed service records</Text>
      </View>
      <View style={styles.listHeader}>
        <View style={styles.searchBarContainer}>
          <Feather name="search" size={20} color={COLORS.accent} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchBar}
            placeholder="Search by complaint, name, phone or staff"
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </View>
      <FlatList
        style={styles.listWrapper}
        contentContainerStyle={styles.listContent}
        data={filteredComplaints}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="check-circle" size={64} color={COLORS.white} />
            <Text style={styles.emptyText}>No completed complaints found</Text>
            <Text style={styles.emptySubtext}>
              All services have been completed successfully!
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  headerSection: {
    backgroundColor: COLORS.header,
    marginHorizontal: 16,
    marginTop: 16,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: SIZES.h1,
    fontWeight: "bold",
    color: COLORS.white,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: SIZES.body,
    color: COLORS.white,
    textAlign: "center",
    marginTop: 8,
  },
  listHeader: {
    backgroundColor: COLORS.panel,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: SIZES.radius,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  searchBar: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderRadius: SIZES.radius,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 12,
    marginLeft: 6,
    textTransform: "uppercase",
  },
  cardTitle: {
    fontWeight: "bold",
    fontSize: SIZES.h3,
    color: COLORS.accent,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginLeft: 10,
    width: 90,
  },
  infoValue: {
    color: COLORS.textPrimary,
    flex: 1,
  },
  dateSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  dateIcon: {
    marginRight: 8,
  },
  dateText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 80,
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.white,
    marginTop: 16,
    fontSize: SIZES.h3,
    fontWeight: "600",
  },
  emptySubtext: {
    textAlign: "center",
    color: COLORS.white,
    marginTop: 8,
    fontSize: SIZES.body,
  },
});
