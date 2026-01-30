import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import CONFIG_API_BASE_URL from "../../../config";
const API_BASE_URL = `${CONFIG_API_BASE_URL}/api`;

interface Employee {
  emp_id: string;
  name: string;
  role: string;
  department: string;
  email?: string;
  gmail?: string;
}

const TeamMembers: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [teamleaderId, setTeamleaderId] = useState<string | null>(null);

  const fetchEmployees = async (isRefresh = false) => {
    if (!teamleaderId) return;
    if (!isRefresh) setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/teamleader/${teamleaderId}/members/`
      );
      if (!response.ok) throw new Error("Failed to fetch employees");
      const data: Employee[] = await response.json();
      // Deduplicate employees by emp_id to prevent React key warnings
      const uniqueEmployees = Array.from(
        new Map(data.map(emp => [emp.emp_id, emp])).values()
      );
      
      // Debug: Check for duplicates
      const duplicateCodes = data
        .map(e => e.emp_id)
        .filter((v, i, a) => a.indexOf(v) !== i);
      if (duplicateCodes.length > 0) {
        console.log("DUPLICATES FOUND:", duplicateCodes);
      }
      
      setEmployees(uniqueEmployees);
    } catch (err) {
      Alert.alert("Error", "Failed to load employees");
      console.error(err);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };


  useEffect(() => {
    const getLeaderId = async () => {
      const id = await AsyncStorage.getItem("empId");
      setTeamleaderId(id);
    };
    getLeaderId();
  }, []);

  useEffect(() => {
    if (teamleaderId) fetchEmployees();
  }, [teamleaderId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployees(true);
  };

  if (loading)
    return (
      <ActivityIndicator
        size="large"
        color="#fff"
        style={{ flex: 1, marginTop: 50 }}
      />
    );

  return (
    <LinearGradient colors={["#ec407a", "#641b9a"]} style={styles.container}>
      <Text style={styles.title}>Team Members</Text>

      {employees.length === 0 ? (
        <Text style={styles.noDataText}>No team members found</Text>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item, index) => `${item.emp_id}-${index}`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.detail}>Emp ID: {item.emp_id}</Text>
              <Text style={styles.detail}>
                Email: {item.email ?? item.gmail ?? "N/A"}
              </Text>
              <Text style={styles.detail}>Role: {item.role}</Text>
              <Text style={styles.detail}>Department: {item.department}</Text>
            </View>
          )}
        />
      )}
    </LinearGradient>
  );
};

export default TeamMembers;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  detail: {
    fontSize: 14,
    color: "white",
    marginVertical: 2,
  },
  noDataText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 15,
    color: "white",
  },
});
