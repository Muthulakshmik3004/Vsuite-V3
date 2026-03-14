import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, SafeAreaView, StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";

const profileIcon = require("../assets/images/profile10.png");
const userMngmntIcon = require("../assets/images/user mngmnt.jpeg");
const dashboardIcon = require("../assets/images/dashboard (2).png");
const requestsIcon = require("../assets/images/requests.jpeg");
const timesheetIcon = require("../assets/images/dashboard (2).png");
const workModeIcon = require("../assets/images/work-mode.jpeg");
const jobsheetIcon = require("../assets/images/dashboard (2).png");
const vdeskIcon = require("../assets/images/VS.Desk.png");

export default function AdminInt() {
  const router = useRouter();

  const menuItems = [
    { title: "Profile", path: "/AdminProfile", icon: <Image source={profileIcon} style={{ width: 48, height: 48, borderRadius: 10 }} /> },
    { title: "User Management", path: "/userint", icon: <Image source={userMngmntIcon} style={{ width: 48, height: 48, borderRadius: 10 }} /> },
    { title: "Dashboard", path: "/dashboard", icon: <Image source={dashboardIcon} style={{ width: 48, height: 48, borderRadius: 10 }} /> },
    { title: "Timesheet Review", path: "/AdminTimesheetReview", icon: <Image source={timesheetIcon} style={{ width: 48, height: 48, borderRadius: 10 }} /> },
    { title: "Jobsheet", path: "/AdminJobsheetStatus", icon: <Image source={jobsheetIcon} style={{ width: 48, height: 48, borderRadius: 10 }} /> },
    { title: "Requests", path: "/AdminRequest", icon: <Image source={requestsIcon} style={{ width: 48, height: 48, borderRadius: 10 }} /> },
    { title: "Work Mode Management", path: "/adminWorkMode", icon: <Image source={workModeIcon} style={{ width: 48, height: 48, borderRadius: 10 }} /> },
    { title: "Payroll", path: "/adminPayroll", icon: <Image source={dashboardIcon} style={{ width: 48, height: 48, borderRadius: 10 }} /> },
    { title: "V-DESK", path: "/vdesk/home", icon: <Image source={vdeskIcon} style={{ width: 48, height: 48, borderRadius: 10 }} /> },
  ];

  return (
    <LinearGradient colors={['#ec407a', '#641b9a']} style={styles.container}>
      <SafeAreaView style={{ flex: 1, width: '100%' }}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <Text style={styles.title}>Admin Interface</Text>
        </View>
        
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.button}
              onPress={() => router.push(item.path as any)}
            >
              <View style={styles.buttonContent}>
                <View style={styles.iconContainer}>
                  {item.icon}
                </View>
                <Text style={styles.buttonText}>{item.title}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {/* Add bottom padding to ensure last item is fully visible */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 10,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  button: {
    backgroundColor: "rgba(255, 255, 255, 0.15)", // Premium translucent effect
    paddingVertical: 15,
    borderRadius: 20,
    marginBottom: 12,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  iconContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 18,
  },
});
