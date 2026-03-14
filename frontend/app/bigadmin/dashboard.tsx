import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function BigAdminDashboard() {
  const router = useRouter();
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    const getPermissions = async () => {
      const perms = await AsyncStorage.getItem("bigAdminPermissions");
      if (perms) {
        setPermissions(JSON.parse(perms));
      }
    };
    getPermissions();
  }, []);

  const hasVdeskAccess = permissions.includes("vdesk_access");

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>BigAdmin Dashboard</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>User Management</Text>

        <TouchableOpacity style={styles.item}>
          <Text>Create Admin</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item}>
          <Text>View All Users</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item}>
          <Text>Activate / Deactivate Users</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>System</Text>

        <TouchableOpacity style={styles.item}>
          <Text>Permissions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item}>
          <Text>Audit Logs</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.logout}
        onPress={() => router.replace("/")}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFE6EC",
    padding: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  cardTitle: {
    fontWeight: "600",
    marginBottom: 10,
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  logout: {
    backgroundColor: "#ff5c5c",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  logoutText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
});
