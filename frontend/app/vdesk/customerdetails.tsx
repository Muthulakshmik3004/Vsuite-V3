import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_BASE_URL from "../../config";

interface Customer {
  customer_id: string;
  customer_name: string;
  phone: string;
  address: string;
  customer_type: string;

}

const CustomerDetails = () => {
  const [active, setActive] = useState("all");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    customer_id: "",
    customer_name: "",
    customer_email: "",
    phone: "",
    address: "",
    customer_type: "our_customer",
  });

  const fetchData = async (type: string) => {
    try {
      const url = type && type !== "all" ? `${API_BASE_URL}/api/user/?type=${type}` : `${API_BASE_URL}/api/user/`;
      const token = await AsyncStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(url, { headers });
      setCustomers(res.data);
    } catch (err) {
      console.error("❌ Error:", err);
    }
  };

  const handleAddCustomer = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/user/create/`, newCustomer);
      Alert.alert("Success", "Customer added successfully");
      setModalVisible(false);
      setNewCustomer({
        customer_id: "",
        customer_name: "",
        customer_email: "",
        phone: "",
        address: "",
        customer_type: "our_customer",
      });
      fetchData(active); // Refresh the list
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Failed to add customer");
    }
  };

  useEffect(() => {
    fetchData("all");
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* TABS */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              active === "all" && styles.activeTab,
            ]}
            onPress={() => {
              setActive("all");
              fetchData("all");
            }}
          >
            <Text
              style={[
                styles.tabText,
                active === "all" && styles.activeTabText,
              ]}
            >
              All Customers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              active === "our_customer" && styles.activeTab,
            ]}
            onPress={() => {
              setActive("our_customer");
              fetchData("our_customer");
            }}
          >
            <Text
              style={[
                styles.tabText,
                active === "our_customer" && styles.activeTabText,
              ]}
            >
              Our Customers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              active === "external_customer" && styles.activeTab,
            ]}
            onPress={() => {
              setActive("external_customer");
              fetchData("external_customer");
            }}
          >
            <Text
              style={[
                styles.tabText,
                active === "external_customer" && styles.activeTabText,
              ]}
            >
              External Customers
            </Text>
          </TouchableOpacity>
        </View>

        {/* ADD CUSTOMER BUTTON */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add Customer</Text>
        </TouchableOpacity>

        {/* LIST */}
        {customers.map((c, i) => (
          <View key={i} style={styles.customerCard}>
            <Text style={styles.customerText}>
              <Text style={styles.bold}>Customer ID:</Text> {c.customer_id}
            </Text>
            <Text style={styles.customerText}>
              <Text style={styles.bold}>Name:</Text> {c.customer_name}
            </Text>
            <Text style={styles.customerText}>
              <Text style={styles.bold}>Phone:</Text> {c.phone}
            </Text>
            <Text style={styles.customerText}>
              <Text style={styles.bold}>Address:</Text> {c.address}
            </Text>
            <Text style={styles.customerText}>
              <Text style={styles.bold}>Customer Type:</Text> {c.customer_type === 'our_customer' ? 'Our Customer' : c.customer_type === 'external_customer' ? 'External Customer' : c.customer_type === 'complaint_customer' ? 'Complaint Customer' : c.customer_type}
            </Text>
          </View>
        ))}

        {/* MODAL */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Customer</Text>

              <TextInput
                style={styles.input}
                placeholder="Customer ID (optional)"
                value={newCustomer.customer_id}
                onChangeText={(text) => setNewCustomer({ ...newCustomer, customer_id: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Customer Name"
                value={newCustomer.customer_name}
                onChangeText={(text) => setNewCustomer({ ...newCustomer, customer_name: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Email (optional)"
                value={newCustomer.customer_email}
                onChangeText={(text) => setNewCustomer({ ...newCustomer, customer_email: text })}
                keyboardType="email-address"
              />

              <TextInput
                style={styles.input}
                placeholder="Phone"
                value={newCustomer.phone}
                onChangeText={(text) => setNewCustomer({ ...newCustomer, phone: text })}
                keyboardType="phone-pad"
              />

              <TextInput
                style={styles.input}
                placeholder="Address"
                value={newCustomer.address}
                onChangeText={(text) => setNewCustomer({ ...newCustomer, address: text })}
                multiline
              />

              {/* <Text style={styles.label}>Customer Type:</Text> */}
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    newCustomer.customer_type === "our_customer" && styles.activeType,
                  ]}
                  onPress={() => setNewCustomer({ ...newCustomer, customer_type: "our_customer" })}
                >
                  <Text style={styles.typeText}>Our Customer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    newCustomer.customer_type === "external_customer" && styles.activeType,
                  ]}
                  onPress={() => setNewCustomer({ ...newCustomer, customer_type: "external_customer" })}
                >
                  <Text style={styles.typeText}>External Customer</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleAddCustomer}
                >
                  <Text style={styles.submitButtonText}>Add Customer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 20,
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },
  tabs: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#eee",
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#007bff",
  },
  tabText: {
    fontWeight: "600",
    color: "#000",
  },
  activeTabText: {
    color: "#fff",
  },
  customerCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 12,
  },
  customerText: {
    fontSize: 14,
    marginBottom: 4,
  },
  bold: {
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 8,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  typeButtons: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    backgroundColor: "#eee",
    alignItems: "center",
  },
  activeType: {
    backgroundColor: "#007bff",
  },
  typeText: {
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    backgroundColor: "#6c757d",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    backgroundColor: "#28a745",
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default CustomerDetails;
