import React, { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  Modal,
  SafeAreaView,
  StatusBar,
  Image,
} from "react-native";
import axios from "axios";

import API_BASE_URL from "../../config";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AnimatedOrbs from "../../components/AnimatedOrbs";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { WebView } from "react-native-webview";


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

const FILTER_OPTIONS = [
  { label: "Total", value: "all", iconName: "database" },
  { label: "Pending", value: "pending", iconName: "inbox" },
  { label: "Assigned", value: "assigned", iconName: "user-check" },
  { label: "Completed", value: "completed", iconName: "check-square" },
];

interface Complaint {
  id?: string;
  _id?: { $oid: string };
  complaint_no: string;
  company?: string;
  customer_name: string;
  phone: string;
  customer_email: string;
  address?: string;
  product_id: string;
  product_name?: string;
  details: string;
  assigned: boolean | string;
  assigned_emp_id?: string;
  assigned_emp_name?: string;
  status?: "pending" | "completed";
  is_overdue?: boolean;
  due_date?: string;
  date_created?: string;
  payment_method?: string;
  remarks?: string;
  invoice_image?: {
    image?: string;
    pdf?: string;
  };
  booking_otp?: string;
  payment_done?: boolean;
}

// Reusable component to display a row of info
const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoRowIcon}>{icon}</View>
    <Text style={styles.infoRowLabel}>{label}:</Text>
    <Text style={styles.infoRowValue}>{value}</Text>
  </View>
);

export default function Dashboard() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [activeComplaintId, setActiveComplaintId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "pending" | "assigned" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [lockOthers, setLockOthers] = useState(false);
  const [lockDueDate, setLockDueDate] = useState(false);
  const [lockPayment, setLockPayment] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState<{ [key: string]: any }>({});


  const deleteInvoice = async (
    complaintId: string,
    type: "image" | "pdf" | "all" = "all"
  ) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/api/user/complaints/${complaintId}/delete-invoice/`,
        { data: { type } }
      );

      alert("Invoice deleted");
      fetchComplaints();
    } catch (e) {
      alert("Failed to delete invoice");
    }
  };
  const requestImagePermission = async (): Promise<boolean> => {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log("MEDIA PERMISSION RESULT:", res);

    if (res.status !== "granted") {
      alert("Gallery permission denied");
      return false;
    }
    return true;
  };




  const uploadInvoiceImage = async (complaintId: string) => {
    const hasPermission = await requestImagePermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    console.log("IMAGE PICKER RESULT:", result);
    if (result.canceled) return;

    const file = result.assets[0];

    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: "invoice.jpg",
      type: "image/jpeg",
    } as any);

    formData.append("type", "image");

    await axios.post(
      `${API_BASE_URL}/api/user/complaints/${complaintId}/upload-invoice/`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    fetchComplaints();
  };




  const uploadInvoicePdf = async (complaintId: string) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
    });

    if (result.canceled) return;

    const pdf = result.assets[0];

    const formData = new FormData();
    formData.append("file", {
      uri: pdf.uri,
      name: pdf.name || "invoice.pdf",
      type: "application/pdf",
    } as any);

    formData.append("type", "pdf");

    await axios.post(
      `${API_BASE_URL}/api/user/complaints/${complaintId}/upload-invoice/`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    fetchComplaints();
  };


  const downloadInvoice = async (url: string) => {
    const isPdf = url.endsWith(".pdf");
    const fileUri =
      FileSystem.documentDirectory + (isPdf ? "invoice.pdf" : "invoice.jpg");

    await FileSystem.downloadAsync(url, fileUri);
    await Sharing.shareAsync(fileUri);
  };


  const resetFields = () => {
    setExpandedId(null);
    setPaymentMethod("");
    setRemarks("");
    setLockPayment(false);
    setLockDueDate(false);
    fetchComplaints();
  };

  useFocusEffect(
    useCallback(() => {
      fetchComplaints();
    }, [])
  );

  const fetchComplaints = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/user/complaints/`);
      setComplaints(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      // Failed to load complaints
    }
  };

  const pendingUnassigned = complaints.filter((c) => c.status?.toLowerCase() === "pending" && (!c.assigned || c.assigned === "false"));
  const pendingAssigned = complaints.filter((c) => c.status?.toLowerCase() === "pending" && c.assigned && c.assigned !== "false");
  const pending = [...pendingUnassigned, ...pendingAssigned];
  const completed = complaints.filter((c) => c.status?.toLowerCase() === "completed");
  // ================== INVOICE & PAYMENT COUNTS ==================

  // Invoice uploaded
  const invoiceUploadedCount = complaints.filter(
    c => c.invoice_image?.image || c.invoice_image?.pdf
  ).length;

  // Payment completed
  const paymentCompletedCount = complaints.filter(
    c =>
      c.status === "completed" &&
      c.payment_method &&
      c.payment_method !== "N/A"
  ).length;

  // Pending
  const pendingInvoiceCount = pending.filter(
    c => c.invoice_image?.image || c.invoice_image?.pdf
  ).length;

  // Completed
  const completedInvoiceCount = completed.filter(
    c => c.invoice_image?.image || c.invoice_image?.pdf
  ).length;

  const completedPaymentCount = completed.filter(
    c => c.payment_method && c.payment_method !== "N/A"
  ).length;

  const getId = (item: Complaint) => item.id?.toString() || item._id?.$oid?.toString() || "";

  const fetchEmployeeDetails = async (empId: string) => {
    if (employeeDetails[empId]) return; // already fetched
    try {
      const res = await axios.get(`${API_BASE_URL}/api/user/employee/${empId}/`);
      setEmployeeDetails(prev => ({ ...prev, [empId]: res.data }));
    } catch (err) {
      console.log("Failed to fetch employee details:", err);
    }
  };




  const handleComplete = async (id: string, staff_name: string) => {
    console.log("handleComplete called with id:", id, "staff_name:", staff_name);

    const isPaymentSelected = paymentMethod !== "";
    const isDueDateSelected = !lockDueDate;

    console.log("isPaymentSelected:", isPaymentSelected, "isDueDateSelected:", isDueDateSelected);

    // ❌ Nothing selected
    if (!isPaymentSelected && !isDueDateSelected) {
      alert("Please select Payment OR Due Date.");
      return;
    }

    // ❌ Both selected
    if (isPaymentSelected && isDueDateSelected) {
      alert("Please select ONLY ONE: Payment OR Due Date.");
      return;
    }

    let payload: any = {
      status: "completed",
      assigned_emp_name: staff_name || "N/A", // backend requires this
    };

    // ⭐ PAYMENT SELECTED
    if (isPaymentSelected && !isDueDateSelected) {
      payload.payment_method = paymentMethod;
      payload.remarks = remarks || "N/A";
      payload.due_date = null;
    }

    // ⭐ DUE DATE SELECTED
    if (!isPaymentSelected && isDueDateSelected) {
      payload.payment_method = "N/A";      // backend does NOT allow null
      payload.remarks = "N/A";             // backend does NOT allow null
      payload.due_date = dueDate.toISOString();
    }

    console.log("Payload:", payload);

    try {
      const response = await axios.put(`${API_BASE_URL}/api/user/complaints/${id}/`, payload);
      console.log("Update response:", response);
      alert("Updated Successfully!");
      resetFields();
    } catch (err: any) {
      console.log("UPDATE ERROR:", err?.message || err);
      console.log("Error response:", err.response);
      alert("Update failed!");
    }
  };


  const getFilteredData = (): Complaint[] => {
    let data: Complaint[];
    if (filter === "all") {
      data = complaints;
    } else if (filter === "pending") {
      data = pendingUnassigned;
    } else if (filter === "assigned") {
      data = pendingAssigned;
    } else if (filter === "completed") {
      data = completed;
    } else {
      data = complaints;
    }

    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter(
      (item) =>
        item.complaint_no?.toLowerCase().includes(query) ||
        item.customer_name?.toLowerCase().includes(query) ||
        item.phone?.toLowerCase().includes(query) ||
        item.assigned_emp_name?.toLowerCase().includes(query)
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

  const renderPendingItem = ({ item }: { item: Complaint }) => {
    const isOverdue = item.is_overdue === true;

    return (
      <View
        style={[
          styles.card,
          isOverdue && { borderWidth: 2, borderColor: COLORS.danger }, // 🔥 Highlight overdue
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            // 🔥 IF STAFF NOT ASSIGNED → GO TO SELECT STAFF SCREEN
            if (!item.assigned) {
              router.push({
                pathname: "/vdesk/Selectstaff",
                params: {
                  complaintId: getId(item),
                  complaintNo: item.complaint_no,
                },
              });
              return;
            }

            // 🔽 IF STAFF ALREADY ASSIGNED → NORMAL EXPAND
            const newId = expandedId === getId(item) ? null : getId(item);
            setExpandedId(newId);
            if (newId && item.assigned_emp_id) {
              fetchEmployeeDetails(item.assigned_emp_id);
            }
          }}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.complaint_no}</Text>

            {/* 🔥 Overdue badge */}
            {isOverdue ? (
              <View style={[styles.statusBadge, { backgroundColor: COLORS.danger }]}>
                <Feather name="alert-triangle" size={14} color={COLORS.white} />
                <Text style={styles.statusText}>OVERDUE</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: COLORS.danger }]}>
                <Feather name="alert-circle" size={14} color={COLORS.white} />
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            )}
          </View>
          {renderInfoRow("briefcase", "Company", item.company || "-")}
          {renderInfoRow("user", "Customer", item.customer_name)}
          {renderInfoRow("phone", "Phone", item.phone)}
          {renderInfoRow("mail", "Email", item.customer_email)}
          {renderInfoRow("map-pin", "Address", item.address || "-")}
          {renderInfoRow("package", "Product", item.product_name || item.product_id || "-")}
          {renderInfoRow("alert-circle", "Issue", item.details)}
          {(item?.assigned === true || item?.assigned === "true") && (
            <>
              {renderInfoRow(
                "credit-card",
                "Employee ID",
                item.assigned_emp_id || "-"
              )}
              {renderInfoRow(
                "user",
                "Assigned Employee",
                item.assigned_emp_name || "-"
              )}
            </>
          )}





          {/* 📄 Invoice Status */}
          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <View
              style={{
                backgroundColor:
                  item.invoice_image?.image || item.invoice_image?.pdf
                    ? COLORS.success
                    : COLORS.danger,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Feather
                name={
                  item.invoice_image?.image || item.invoice_image?.pdf
                    ? "file-text"
                    : "x-circle"
                }
                size={14}
                color="#fff"
              />
              <Text style={{ color: "#fff", marginLeft: 6, fontSize: 12 }}>
                {item.invoice_image?.image || item.invoice_image?.pdf
                  ? "Invoice Added"
                  : "Invoice Pending"}
              </Text>
            </View>
          </View>

          {/* 🔥 Due Date */}
          {item.due_date && (
            <Text
              style={[
                styles.dateText,
                isOverdue && { color: COLORS.danger, fontWeight: "bold" },
              ]}
            >
              Due Date: {new Date(item.due_date).toDateString()}
            </Text>
          )}

          {/* Created Date */}
          {item.date_created && (
            <Text style={styles.dateText}>
              Created: {new Date(item.date_created).toLocaleString()}
            </Text>
          )}
        </TouchableOpacity>

        {/* 🔽 Expand Section */}
        {expandedId === getId(item) && item.assigned && (
          <View style={styles.expandSection}>
            {/* Employee Details */}
            {item.assigned_emp_id && employeeDetails[item.assigned_emp_id] && (
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.label}>Employee Contact</Text>
                {employeeDetails[item.assigned_emp_id].phone && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Feather name="phone" size={16} color={COLORS.primary} />
                    </View>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{employeeDetails[item.assigned_emp_id].phone}</Text>
                  </View>
                )}
                {employeeDetails[item.assigned_emp_id].location && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Feather name="map-pin" size={16} color={COLORS.primary} />
                    </View>
                    <Text style={styles.infoLabel}>Location</Text>
                    <Text style={styles.infoValue}>{employeeDetails[item.assigned_emp_id].location}</Text>
                  </View>
                )}
              </View>
            )}
            <Text style={styles.label}>Select Payment Method</Text>

            <View style={styles.paymentContainer}>
              {["cash", "upi"].map((method) => {
                const isSelected = paymentMethod === method;
                return (
                  <TouchableOpacity
                    key={method}
                    disabled={lockPayment}  // 🔥 ADD HERE
                    style={[
                      styles.paymentButton,
                      isSelected && styles.selectedButton,
                      lockPayment && { opacity: 0.4 }  // 🔥 ADD HERE
                    ]}
                    onPress={() => {
                      setPaymentMethod(method);
                      setLockPayment(false);   // payment active
                      setLockDueDate(true);    // disable due date
                    }}

                  >
                    <Feather
                      name={method === "cash" ? "dollar-sign" : "smartphone"}
                      size={16}
                      color={isSelected ? COLORS.white : COLORS.accent}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[
                        styles.paymentButtonText,
                        isSelected && styles.selectedButtonText,
                      ]}
                    >
                      {method.toUpperCase()}
                    </Text>
                    {isSelected && (
                      <Feather
                        name="check"
                        size={16}
                        color={COLORS.white}
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 🔥 Due Date Picker */}
            <Text style={styles.label}>Select Due Date</Text>

            <TouchableOpacity
              style={[
                styles.dateBox,
                lockDueDate && { opacity: 0.4 }
              ]}
              disabled={lockDueDate}
              onPress={() => {
                setLockPayment(true);        // disable cash/upi/remarks
                setLockDueDate(false);       // activate due date
                setPaymentMethod("");        // clear payment choice
                setRemarks("");              // clear remarks
                setShowDatePicker(true);
              }}
            >

              <Feather name="calendar" size={16} color={COLORS.accent} />
              <Text style={styles.dateText2}>{dueDate.toDateString()}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                display="calendar"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDueDate(selectedDate);
                }}
              />
            )}

            <TextInput
              placeholder="Enter remarks"
              style={[
                styles.input,
                lockPayment && { backgroundColor: "#ccc" }
              ]}
              editable={!lockPayment}     // block when due date active
              value={remarks}
              onChangeText={setRemarks}
              multiline
            />
            {/* 📤 Upload Invoice – ALWAYS visible */}
            <TouchableOpacity
              style={[styles.completeButton, { backgroundColor: COLORS.primary }]}
              onPress={() => {
                setActiveComplaintId(getId(item));
                setShowUploadOptions(true);
              }}
            >
              <Feather name="upload" size={18} color="#fff" />
              <Text style={styles.completeText}>Upload Invoice</Text>
            </TouchableOpacity>

            {/* ✅ Invoice Actions – SHOW ANYTIME AFTER UPLOAD */}
            {(item.invoice_image?.image || item.invoice_image?.pdf) && (
              <View style={{ marginTop: 10 }}>

                {/* Preview */}
                <TouchableOpacity
                  style={[styles.completeButton, { backgroundColor: COLORS.primary }]}
                  onPress={() => {
                    setSelectedInvoice(
                      item.invoice_image?.image || item.invoice_image?.pdf || null
                    );
                    setShowInvoiceModal(true);
                  }}
                >
                  <Feather name="eye" size={18} color="#fff" />
                  <Text style={styles.completeText}>Preview Invoice</Text>
                </TouchableOpacity>

                {/* Download */}
                <TouchableOpacity
                  style={[styles.completeButton, { backgroundColor: COLORS.accent }]}
                  onPress={() =>
                    downloadInvoice(
                      item.invoice_image?.image || item.invoice_image?.pdf!
                    )
                  }
                >
                  <Feather name="download" size={18} color="#fff" />
                  <Text style={styles.completeText}>Download Invoice</Text>
                </TouchableOpacity>

                {/* Replace */}
                <TouchableOpacity
                  style={[styles.completeButton, { backgroundColor: COLORS.success }]}
                  onPress={() => {
                    setActiveComplaintId(getId(item));
                    setShowUploadOptions(true);
                  }}
                >
                  <Feather name="refresh-cw" size={18} color="#fff" />
                  <Text style={styles.completeText}>Replace Invoice</Text>
                </TouchableOpacity>

                {/* Delete */}
                <TouchableOpacity
                  style={[styles.completeButton, { backgroundColor: COLORS.danger }]}
                  onPress={() => deleteInvoice(getId(item), "all")}
                >
                  <Feather name="trash-2" size={18} color="#fff" />
                  <Text style={styles.completeText}>Delete Invoice</Text>
                </TouchableOpacity>

              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={[styles.completeButton, { flex: 1, marginRight: 5, backgroundColor: COLORS.danger }]}
                onPress={async () => {
                  try {
                    await axios.put(`${API_BASE_URL}/api/user/complaints/${getId(item)}/`, {
                      assigned: false,
                      assigned_emp_id: null,
                      assigned_emp_name: null,
                    });
                    fetchComplaints();
                    setExpandedId(null);
                  } catch (err) {
                    alert("Failed to remove assignment");
                  }
                }}
              >
                <Feather name="user-x" size={20} color={COLORS.white} />
                <Text style={styles.completeText}>Remove Assignment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.completeButton, { flex: 1, marginLeft: 5 }]}
                onPress={() => handleComplete(getId(item), item.assigned_emp_name!)}
              >
                <Feather name="check-circle" size={20} color={COLORS.white} />
                <Text style={styles.completeText}>Mark as Completed</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

  const renderCompletedItem = ({ item }: { item: Complaint }) => {
    // ✅ Payment-aware overdue logic
    const isPaymentCompleted =
      item.payment_method && item.payment_method !== "N/A";

    const isOverdue =
      !isPaymentCompleted &&
      item.due_date &&
      new Date(item.due_date).getTime() < new Date().getTime();


    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.complaint_no}</Text>

          {isOverdue ? (
            <View style={[styles.statusBadge, { backgroundColor: COLORS.danger }]}>
              <Feather name="alert-triangle" size={14} color="#fff" />
              <Text style={styles.statusText}>OVERDUE</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: COLORS.success }]}>
              <Feather name="check" size={14} color="#fff" />
              <Text style={styles.statusText}>COMPLETED</Text>
            </View>
          )}
        </View>
        {renderInfoRow("briefcase", "Company", item.company || "-")}
        {renderInfoRow("user", "Customer", item.customer_name)}
        {renderInfoRow("phone", "Phone", item.phone)}
        {renderInfoRow("mail", "Email", item.customer_email)}
        {renderInfoRow("map-pin", "Address", item.address || "-")}
        {renderInfoRow("package", "Product", item.product_name || item.product_id || "-")}

        {renderInfoRow("alert-circle", "Issue", item.details)}
        {renderInfoRow("credit-card", "Payment", item.payment_method || "-")}
        {renderInfoRow("message-square", "Remarks", item.remarks || "-")}
        {item.assigned ? (
          <>
            {renderInfoRow("user-check", "Assigned Employee", item.assigned_emp_name || "Not Assigned")}
            {renderInfoRow("credit-card", "Employee ID", item.assigned_emp_id || "-")}
          </>
        ) : (
          renderInfoRow("user-check", "Assigned", "Not Assigned")
        )}
        <View style={{ flexDirection: "row", marginTop: 10, flexWrap: "wrap" }}>

          {/* 📄 Invoice */}
          <View
            style={{
              backgroundColor:
                item.invoice_image?.image || item.invoice_image?.pdf
                  ? COLORS.success
                  : COLORS.danger,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              marginRight: 8,
              marginBottom: 6,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Feather name="file-text" size={14} color="#fff" />
            <Text style={{ color: "#fff", marginLeft: 6, fontSize: 12 }}>
              Invoice Added
            </Text>
          </View>

          {/* 💰 Payment */}
          <View
            style={{
              backgroundColor:
                item.payment_method && item.payment_method !== "N/A"
                  ? COLORS.success
                  : COLORS.danger,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              marginBottom: 6,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Feather name="check-circle" size={14} color="#fff" />
            <Text style={{ color: "#fff", marginLeft: 6, fontSize: 12 }}>
              Payment Completed
            </Text>
          </View>

        </View>

        {item.invoice_image?.image || item.invoice_image?.pdf ? (
          <View style={{ marginTop: 10 }}>

            {/* Preview */}
            <TouchableOpacity
              style={[styles.completeButton, { backgroundColor: COLORS.primary }]}
              onPress={() => {
                setSelectedInvoice(
                  item.invoice_image?.image || item.invoice_image?.pdf || null
                );
                setShowInvoiceModal(true);
              }}
            >
              <Feather name="eye" size={18} color="#fff" />
              <Text style={styles.completeText}>Preview Invoice</Text>
            </TouchableOpacity>

            {/* Download */}
            <TouchableOpacity
              style={[styles.completeButton, { backgroundColor: COLORS.accent }]}
              onPress={() =>
                downloadInvoice(
                  item.invoice_image?.image || item.invoice_image?.pdf!
                )
              }
            >
              <Feather name="download" size={18} color="#fff" />
              <Text style={styles.completeText}>Download Invoice</Text>
            </TouchableOpacity>

            {/* Replace */}
            <TouchableOpacity
              style={[styles.completeButton, { backgroundColor: COLORS.success }]}
              onPress={() => {
                setShowInvoiceModal(false);      // 🔥 CLOSE PREVIEW
                setSelectedInvoice(null);
                setActiveComplaintId(getId(item));
                setShowUploadOptions(true);
              }}
            >
              <Feather name="refresh-cw" size={18} color="#fff" />
              <Text style={styles.completeText}>Replace Invoice</Text>
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity
              style={[styles.completeButton, { backgroundColor: COLORS.danger }]}
              onPress={() => deleteInvoice(getId(item), "all")}
            >
              <Feather name="trash-2" size={18} color="#fff" />
              <Text style={styles.completeText}>Delete Invoice</Text>
            </TouchableOpacity>

          </View>
        ) : (
          <TouchableOpacity
            style={[styles.completeButton, { backgroundColor: COLORS.danger }]}
            onPress={() => {
              setShowInvoiceModal(false);      // 🔥 CLOSE PREVIEW
              setSelectedInvoice(null);
              setActiveComplaintId(getId(item));
              setShowUploadOptions(true);
            }}
          >
            <Feather name="upload" size={18} color="#fff" />
            <Text style={styles.completeText}>Upload Invoice</Text>
          </TouchableOpacity>

        )}

        {/* 🔥 Show Due Date with overdue highlight */}
        {item.due_date && (
          <Text
            style={[
              styles.dateText,
              isOverdue && { color: COLORS.danger, fontWeight: "bold" },
            ]}
          >
            Due Date: {new Date(item.due_date).toDateString()}
          </Text>
        )}

        {/* Created Date */}
        {item.date_created && (
          <Text style={styles.dateText}>
            Created: {new Date(item.date_created).toLocaleString()}
          </Text>
        )}
      </View>
    );
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AnimatedOrbs count={18} />
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((option) => {
            const count =
              option.value === "all"
                ? complaints.length
                : option.value === "pending"
                  ? pendingUnassigned.length
                  : option.value === "assigned"
                    ? pendingAssigned.length
                    : completed.length;
            const isActive = filter === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.filterCard, isActive && styles.filterCardActive]}
                onPress={() => {
                  setFilter(option.value as any);
                  setSearchQuery("");
                  setExpandedId(null);
                }}
              >
                <View style={[styles.filterIcon, isActive && styles.filterIconActive]}>
                  <Feather
                    name={option.iconName as any}
                    size={20}
                    color={isActive ? COLORS.primary : COLORS.primary}
                  />
                </View>
                <Text
                  style={[styles.filterLabel, isActive && styles.filterLabelActive]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[styles.filterCount, isActive && styles.filterLabelActive]}
                >
                  {count}
                </Text>
                {/* 📄 Invoice Count */}
                <Text style={{ fontSize: 12, color: isActive ? "#fff" : "#000" }}>
                  📄 Invoices:{" "}
                  {option.value === "all"
                    ? invoiceUploadedCount
                    : option.value === "pending"
                      ? pendingInvoiceCount
                      : completedInvoiceCount}
                </Text>

                {/* 💰 Payment Count (Completed only) */}
                {option.value !== "pending" && (
                  <Text style={{ fontSize: 12, color: isActive ? "#fff" : "#000" }}>
                    💰 Paid:{" "}
                    {option.value === "all"
                      ? paymentCompletedCount
                      : completedPaymentCount}
                  </Text>
                )}

              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={styles.listHeader}>

        {/* 🔵 ROW: Export + Search */}
        <View style={styles.topRow}>

          {/* Search Bar */}
          <View style={styles.searchBarSmallContainer}>
            <Feather name="search" size={18} color={COLORS.accent} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchBarSmall}
              placeholder="Search..."
              placeholderTextColor={COLORS.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

        </View>



      </View>

      <FlatList
        style={styles.listWrapper}
        contentContainerStyle={styles.listContent}
        data={getFilteredData()}
        keyExtractor={(item, index) => getId(item) || index.toString()}
        renderItem={({ item }) =>
          item.status?.toLowerCase() === "completed"
            ? renderCompletedItem({ item })
            : renderPendingItem({ item })
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={64} color={COLORS.white} />
            <Text style={styles.emptyText}>No complaints found</Text>
          </View>
        }
      />


      {/* 📤 Upload Options Modal */}
      <Modal visible={showUploadOptions} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>

            <Text style={styles.modalTitle}>Upload Invoice</Text>

            {/* Upload Image */}
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => {
                if (!activeComplaintId) {
                  alert("Complaint ID missing");
                  return;
                }
                setShowUploadOptions(false);
                uploadInvoiceImage(activeComplaintId);
              }}
            >
              <Feather name="image" size={18} color="#fff" />
              <Text style={styles.completeText}>Upload Image</Text>
            </TouchableOpacity>

            {/* Upload PDF */}
            <TouchableOpacity
              style={[styles.completeButton, { backgroundColor: COLORS.accent }]}
              onPress={() => {
                if (!activeComplaintId) {
                  alert("Complaint ID missing");
                  return;
                }
                const id = activeComplaintId;
                setShowUploadOptions(false);
                uploadInvoicePdf(activeComplaintId);
              }}
            >
              <Feather name="file-text" size={18} color="#fff" />
              <Text style={styles.completeText}>Upload PDF</Text>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setShowUploadOptions(false);
                setActiveComplaintId(null);
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
      {/* 👁️ Invoice Preview Modal */}
      <Modal
        visible={showInvoiceModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowInvoiceModal(false);
          setSelectedInvoice(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { height: "80%" }]}>

            <Text style={styles.modalTitle}>Invoice Preview</Text>

            {selectedInvoice ? (
              selectedInvoice.toLowerCase().endsWith(".pdf") ? (
                // 📄 PDF Preview
                <WebView
                  source={{ uri: selectedInvoice }}
                  style={{ flex: 1 }}
                />
              ) : (
                // 🖼 Image Preview
                <Image
                  source={{ uri: selectedInvoice }}
                  style={{ width: "100%", height: "100%", resizeMode: "contain" }}
                />
              )
            ) : (
              <Text>No invoice available</Text>
            )}

            <TouchableOpacity
              style={[styles.cancelBtn, { marginTop: 10 }]}
              onPress={() => {
                setShowInvoiceModal(false);
                setSelectedInvoice(null);
              }}
            >
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>


    </SafeAreaView>


  );

}
// ✅ Styles
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
  filterRow: {
    flexDirection: "row",
    marginTop: 20,
  },
  filterCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    paddingVertical: 16,
    marginHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  filterCardActive: {
    backgroundColor: COLORS.accent,
  },
  filterIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  filterIconActive: {
    backgroundColor: COLORS.white,
  },
  filterLabel: {
    color: COLORS.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  filterLabelActive: {
    color: COLORS.white,
  },
  filterCount: {
    fontSize: SIZES.h3,
    fontWeight: "bold",
    marginTop: 6,
    color: COLORS.textPrimary,
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
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  addNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: SIZES.radius,
  },
  addNewBtnText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 10,
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
  cardTitle: {
    fontWeight: "bold",
    fontSize: SIZES.h3,
    color: COLORS.accent,
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
  infoRowIcon: {
    width: 24,
    alignItems: "center",
    marginRight: 8,
  },
  infoRowLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    width: 80,
  },
  infoRowValue: {
    flex: 1,
    fontSize: 14,
    color: "#666",
  },
  dateText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 12,
    textAlign: "right",
  },
  expandSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
  },
  label: {
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  paymentContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  paymentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.accent,
    marginRight: 10,
    marginBottom: 10,
  },
  paymentButtonText: {
    fontWeight: "600",
    color: COLORS.accent,
  },
  selectedButton: {
    backgroundColor: COLORS.accent,
  },
  dateBox: {
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
  dateText2: {
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  selectedButtonText: {
    color: COLORS.white,
  },
  inputWrapper: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: SIZES.body,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    borderRadius: SIZES.radius,
    marginTop: 10,
  },
  completeText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 10,
    fontSize: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  searchBarSmallContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
    flex: 1,
    marginLeft: 10,
  },
  searchBarSmall: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
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
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalCard: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: 20,
  },
  modalTitle: {
    fontSize: SIZES.h2,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: COLORS.primary,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  addBtn: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    borderRadius: SIZES.radius,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginRight: 6,
  },
  addBtnText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.danger,
    paddingVertical: 14,
    borderRadius: SIZES.radius,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginLeft: 6,
  },
  cancelBtnText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
});
