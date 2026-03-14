import React, { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  StatusBar,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import axios from "axios";
import API_BASE_URL from "../../config";

const { height } = Dimensions.get("window");

const COLORS = {
  background: "#6addf7ff",
  primary: "#007bff",
  secondary: "#2694a8ff",
  accent: "#2694a8ff",
  success: "#399a43ff",
  danger: "#eb5968ff",
  white: "#ffffff",
};

// Menu items → MUST match file paths
const menuItems = [
  {
    key: "Dashboard",
    title: "Dashboard",
    subtitle: "Monitor & manage services",
    icon: "trending-up",
    path: "/vdesk/Dashboard",
    color: COLORS.primary,
  },
  {
    key: "CustomerDetails",
    title: "Customer Details",
    subtitle: "View and manage customers",
    icon: "user",
    path: "/vdesk/customerdetails",
    color: "#9c27b0",
  },
  {
    key: "Booking",
    title: "Book Service",
    subtitle: "Submit new complaints",
    icon: "package",
    path: "/vdesk/Bookingservice",
    color: COLORS.secondary,
  },
  {
    key: "Staff",
    title: "Staff Management",
    subtitle: "Manage team & assignments",
    icon: "users",
    path: "/vdesk/staff",
    color: COLORS.accent,
  },
  {
    key: "DueReminder",
    title: "Due Reminders",
    subtitle: "View overdue & upcoming tasks",
    icon: "clock",
    path: "/vdesk/DueReminderScreen",
    color: "#ff5722",
  },
  {
    key: "UploadExcel",
    title: "Upload Excel",
    subtitle: "Import complaint data",
    icon: "upload",
    path: "/vdesk/UploadExcel",
    color: COLORS.success,
  },
  {
    key: "ExportData",
    title: "Export Data",
    subtitle: "Download reports",
    icon: "download-cloud",
    path: "/vdesk/ExportScreen",
    color: "#ff8c42",
  },
  {
    key: "ProductManagement",
    title: "Product Management",
    subtitle: "Manage products",
    icon: "package",
    path: "/vdesk/ProductPage",
    color: "#9c27b0",
  },
];

export default function Home() {
  const router = useRouter();

  const [quickStats, setQuickStats] = useState([
    { label: "Completed Tasks", value: "0", icon: "check-square", color: COLORS.success },
    { label: "Pending Tasks", value: "0", icon: "clipboard", color: COLORS.danger },
    { label: "Team Members", value: "0", icon: "users", color: COLORS.primary },
  ]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardStats();
    }, [])
  );

  const fetchDashboardStats = async () => {
    try {
      const complaintsRes = await axios.get(`${API_BASE_URL}/api/user/complaints/`);
      const staffRes = await axios.get(`${API_BASE_URL}/api/user/hardware-employees/`);

      const complaints = Array.isArray(complaintsRes.data) ? complaintsRes.data : [];
      const staff = Array.isArray(staffRes.data) ? staffRes.data : [];

      const completed = complaints.filter(c => c.status?.toLowerCase() === "completed").length;
      const pending = complaints.filter(c => c.status?.toLowerCase() === "pending").length;

      setQuickStats([
        { label: "Completed Tasks", value: completed.toString(), icon: "check-square", color: COLORS.success },
        { label: "Pending Tasks", value: pending.toString(), icon: "clipboard", color: COLORS.danger },
        { label: "Team Members", value: staff.length.toString(), icon: "users", color: COLORS.primary },
      ]);
    } catch (err) {
      console.error("Dashboard stats error:", err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background */}
      <View style={styles.backgroundPattern}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Welcome back!</Text>
          <Text style={styles.headerSubtitle}>
            Manage your water purification services with ease
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Quick Overview</Text>
          <View style={styles.statsGrid}>
            {quickStats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <Feather name={stat.icon as any} size={24} color={stat.color} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Main Services</Text>

          {menuItems.map(item => (
            <TouchableOpacity
              key={item.key}
              style={styles.menuCard}
              onPress={() => router.push(item.path)}
            >
              <Feather name={item.icon as any} size={26} color={item.color} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Feather name="chevron-right" size={20} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  backgroundPattern: { ...StyleSheet.absoluteFillObject },
  circle: { position: "absolute", borderRadius: 200, opacity: 0.1 },
  circle1: { width: 300, height: 300, backgroundColor: COLORS.primary, top: -150, right: -150 },
  circle2: { width: 200, height: 200, backgroundColor: COLORS.secondary, top: height * 0.3, left: -100 },
  circle3: { width: 250, height: 250, backgroundColor: COLORS.accent, bottom: -125, right: -125 },

  headerSection: { padding: 30, alignItems: "center" },
  headerTitle: { fontSize: 30, fontWeight: "bold", color: COLORS.white },
  headerSubtitle: { color: COLORS.white, opacity: 0.9 },

  statsSection: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 22, fontWeight: "bold", color: COLORS.white, marginBottom: 12 },
  statsGrid: { flexDirection: "row" },
  statCard: { backgroundColor: "#fff", padding: 16, borderRadius: 12, alignItems: "center", flex: 1, margin: 4 },
  statValue: { fontSize: 22, fontWeight: "bold" },
  statLabel: { fontSize: 12, color: "#666" },

  menuSection: { padding: 20 },
  menuCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 18, borderRadius: 14, marginBottom: 12 },
  menuTitle: { fontSize: 18, fontWeight: "bold" },
  menuSubtitle: { fontSize: 13, color: "#666" },
});
