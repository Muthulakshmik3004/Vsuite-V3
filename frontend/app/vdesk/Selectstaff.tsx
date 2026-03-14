import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import axios from "axios";
import { useRoute } from "@react-navigation/native";
import { router } from "expo-router";
import API_BASE_URL from "../../config";
import AnimatedOrbs from "../../components/AnimatedOrbs";

const { width, height } = Dimensions.get("window");

const COLORS = {
  background: "#6addf7ff",
  header: "#12b5d9ff",
  panel: "#b2ebf2",
  surface: "#9ad7ecff",
  primary: "#007bff",
  secondary: "#2694a8ff",
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

const FILTER_OPTIONS = [
  { label: "Available Staff", value: "available", icon: "person" },
  { label: "Pending Staff", value: "pending", icon: "time" },
];

export default function SelectStaff() {
  const route = useRoute<any>();
  const { complaintNo } = route.params || {};

  const [viewMode, setViewMode] = useState<"available" | "pending">("available");
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [product, setProduct] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  const [pendingStaff, setPendingStaff] = useState<any[]>([]);
  const [availableCount, setAvailableCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchData = async () => {
    try {
      const [availableRes, pendingRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/user/selectstaff/`, { params: { mode: "available" } }),
        axios.get(`${API_BASE_URL}/api/user/selectstaff/`, { params: { mode: "pending" } }),
      ]);

      // The API already returns correct available staff, no need to filter again
      // The backend handles the filtering logic properly
      const trulyAvailableEmp = availableRes.data;

      // Sort pending by most recent complaint
      const sortedPending = pendingRes.data.sort((a: any, b: any) => {
        const getMostRecentTime = (emp: any) => {
          if (!emp.complaints || emp.complaints.length === 0) return 0;
          const recent = emp.complaints.reduce((latest: any, current: any) => {
            return new Date(current.assigned_at) > new Date(latest.assigned_at)
              ? current
              : latest;
          });
          return new Date(recent.assigned_at).getTime();
        };
        return getMostRecentTime(b) - getMostRecentTime(a);
      });

      setAvailableStaff(trulyAvailableEmp);
      setPendingStaff(sortedPending);
      setAvailableCount(trulyAvailableEmp.length);
      setPendingCount(pendingRes.data.length);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to fetch employees.");
    }
  };

  useEffect(() => {
    fetchData();
    if (complaintNo) fetchComplaintDetails();
  }, [complaintNo]);

  const fetchComplaintDetails = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/user/complaints/by-complaint-no/${complaintNo}/`);
      if (res.data) {
        setProduct(res.data.product_name || res.data.product_id || "");
      }
    } catch (err) {
      console.log("Error fetching complaint details:", err);
    }
  };

  useEffect(() => {
    setStaffList(viewMode === "available" ? availableStaff : pendingStaff);
  }, [viewMode, availableStaff, pendingStaff]);

  const handleAssign = async () => {
    if (!selectedStaff) return;

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/user/assignstaff/`, {
        complaint_no: complaintNo,
        emp_id: selectedStaff,
      });

      if (res.data?.success) {
        setLoading(false);
        Alert.alert("Success", "Staff Assigned Successfully", [
          {
            text: "OK",
            onPress: () => {
              fetchData();
              setSelectedStaff(null);
              router.push("/vdesk/home");
            },
          },
        ]);
      } else {
        setLoading(false);
        Alert.alert("Error", "Failed to assign staff. Try again.");
      }
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", "Failed to assign staff. Try again.");
    }
  };

  const getFilteredData = () => {
    if (!searchQuery.trim()) return staffList;
    const query = searchQuery.toLowerCase();
    return staffList.filter(
      (item) =>
        item.name?.toLowerCase().includes(query) ||
        item.phone?.toLowerCase().includes(query) ||
        item.location?.toLowerCase().includes(query)
    );
  };

  const renderInfoRow = (icon: any, label: string, value: string) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Feather name={icon} size={16} color={COLORS.primary} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  const renderAvailableItem = ({ item }: any) => {
    const isSelected = selectedStaff === item.emp_id;
    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.selectedCard]}
        onPress={() => setSelectedStaff(item.emp_id)}
      >
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.profilePhoto} />
        ) : (
          <View style={styles.placeholderProfilePhoto}>
            <Ionicons name="person" size={40} color={COLORS.accent} />
          </View>
        )}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, isSelected && styles.selectedText]}>
              {item.name}
            </Text>
            {isSelected && (
              <View style={styles.statusBadge}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />
                <Text style={styles.statusText}>Selected</Text>
              </View>
            )}
          </View>
          {renderInfoRow("phone", "Phone", item.phone)}
          {renderInfoRow("map-pin", "Location", item.location)}
        </View>
      </TouchableOpacity>
    );
  };

  const renderPendingItem = ({ item }: any) => {
    const isSelected = selectedStaff === item.emp_id;
    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.selectedCard]}
        onPress={() => setSelectedStaff(item.emp_id)}
      >
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.profilePhoto} />
        ) : (
          <View style={styles.placeholderProfilePhoto}>
            <Ionicons name="person" size={40} color={COLORS.accent} />
          </View>
        )}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, isSelected && styles.selectedText]}>
              {item.name}
            </Text>
            {isSelected && (
              <View style={styles.statusBadge}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />
                <Text style={styles.statusText}>Selected</Text>
              </View>
            )}
          </View>
          {renderInfoRow("phone", "Phone", item.phone)}
          {renderInfoRow("map-pin", "Location", item.location)}
          <Text style={[styles.subTitle, isSelected && styles.selectedText]}>
            Complaints:
          </Text>
          {(item.complaints || []).map((c: any, idx: number) => (
            <View key={idx} style={styles.complaintBox}>
              <Text style={[styles.details, isSelected && styles.selectedText]}>
                Complaint No: {c.complaint_no}
              </Text>
              <Text style={[styles.details, isSelected && styles.selectedText]}>
                Customer Address: {c.customer_address}
              </Text>
              <Text style={[styles.details, isSelected && styles.selectedText]}>
                Customer Phone: {c.customer_phone}
              </Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <>
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Select Staff</Text>
        <Text style={styles.headerSubtitle}>Complaint #{complaintNo}</Text>
        {product ? (
          <Text style={[styles.headerSubtitle, { fontWeight: 'bold', marginTop: 4 }]}>
            Product: {product}
          </Text>
        ) : null}
        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((option) => {
            const isActive = viewMode === option.value;
            const count = option.value === "available" ? availableCount : pendingCount;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.filterCard, isActive && styles.filterCardActive]}
                onPress={() => {
                  setViewMode(option.value as any);
                  setSearchQuery("");
                  setSelectedStaff(null);
                }}
              >
                <View style={[styles.filterIcon, isActive && styles.filterIconActive]}>
                  <Ionicons
                    name={option.icon as any}
                    size={20}
                    color={isActive ? COLORS.primary : COLORS.primary}
                  />
                </View>
                <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                  {option.label}
                </Text>
                <Text style={[styles.filterCount, isActive && styles.filterLabelActive]}>
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={styles.listHeader}>
        <View style={styles.searchBarContainer}>
          <Feather
            name="search"
            size={20}
            color={COLORS.accent}
            style={{ marginRight: 10 }}
          />
          <TextInput
            style={styles.searchBar}
            placeholder="Search by name, phone or location"
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.assignBtn, loading && styles.assignBtnDisabled]}
          onPress={handleAssign}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Ionicons name="send" size={20} color={COLORS.white} />
          )}
          <Text style={styles.assignBtnText}>
            {loading ? "Assigning..." : "Assign Staff"}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AnimatedOrbs count={18} />
      <FlatList
        style={styles.listWrapper}
        contentContainerStyle={styles.listContent}
        data={getFilteredData()}
        keyExtractor={(item) => item.emp_id.toString()}
        renderItem={({ item }) =>
          viewMode === "available"
            ? renderAvailableItem({ item })
            : renderPendingItem({ item })
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={COLORS.white} />
            <Text style={styles.emptyText}>No staff found</Text>
            <Text style={styles.emptySubtext}>
              {viewMode === "available"
                ? "No available staff members"
                : "No staff with pending tasks"}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listWrapper: { flex: 1 },
  listContent: { paddingBottom: 40 },
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
  },
  headerTitle: { fontSize: SIZES.h1, fontWeight: "bold", color: COLORS.white, textAlign: "center" },
  headerSubtitle: { fontSize: SIZES.body, color: COLORS.white, textAlign: "center", marginTop: 8 },
  filterRow: { flexDirection: "row", marginTop: 20 },
  filterCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    paddingVertical: 16,
    marginHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  filterCardActive: { backgroundColor: COLORS.accent },
  filterIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  filterIconActive: { backgroundColor: COLORS.white },
  filterLabel: { color: COLORS.textPrimary, fontWeight: "600", fontSize: 14 },
  filterLabelActive: { color: COLORS.white },
  filterCount: { fontSize: SIZES.h3, fontWeight: "bold", marginTop: 6, color: COLORS.textPrimary },
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
    marginBottom: 12,
  },
  searchBar: { flex: 1, fontSize: 16, color: COLORS.textPrimary },
  assignBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.accent, paddingVertical: 14, borderRadius: SIZES.radius },
  assignBtnDisabled: { backgroundColor: COLORS.muted, opacity: 0.6 },
  assignBtnText: { color: COLORS.white, fontWeight: "bold", fontSize: 16, marginLeft: 10 },
  card: { backgroundColor: COLORS.white, marginHorizontal: 16, marginTop: 16, padding: 18, borderRadius: SIZES.radius, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  selectedCard: { borderColor: COLORS.primary, borderWidth: 3, backgroundColor: COLORS.surface, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, transform: [{ scale: 1.02 }] },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitle: { fontWeight: "bold", fontSize: SIZES.h3, color: COLORS.accent },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.primary },
  statusText: { color: COLORS.white, fontWeight: "bold", fontSize: 12, marginLeft: 6, textTransform: "uppercase" },
  infoRow: { flexDirection: "row", alignItems: "center", marginVertical: 4 },
  infoIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.panel, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontWeight: "600", color: COLORS.textSecondary, marginLeft: 10, width: 90 },
  infoValue: { color: COLORS.textPrimary, flex: 1 },
  subTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12, color: COLORS.textPrimary },
  complaintBox: { padding: 12, borderRadius: 12, marginBottom: 8, backgroundColor: COLORS.panel },
  details: { fontSize: 14, color: COLORS.textPrimary, marginBottom: 2 },
  emptyContainer: { alignItems: "center", marginTop: 80 },
  emptyText: { textAlign: "center", color: COLORS.white, marginTop: 16, fontSize: SIZES.h3, fontWeight: "600" },
  emptySubtext: { fontSize: SIZES.body, color: COLORS.white, opacity: 0.8, textAlign: "center", marginTop: 8 },
  selectedText: { color: COLORS.primary, fontWeight: "bold" },
  profilePhoto: { width: 80, height: 80, borderRadius: 40, alignSelf: "center", marginBottom: 16 },
  placeholderProfilePhoto: { width: 80, height: 80, borderRadius: 40, alignSelf: "center", marginBottom: 16, backgroundColor: COLORS.panel, alignItems: "center", justifyContent: "center" },
  cardContent: { flex: 1 },
});
