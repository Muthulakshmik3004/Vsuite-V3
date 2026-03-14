import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  KeyboardAvoidingView,
  Image,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import RNPickerSelect from "react-native-picker-select";
import { router } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
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

const pickerSelectStyles = {
  inputIOS: { fontSize: 14, color: COLORS.textPrimary, paddingVertical: 12 },
  inputAndroid: {
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  placeholder: { color: COLORS.textSecondary },
  iconContainer: { top: 10, right: 10 },
};

export default function Bookingservice() {
  const pickerRef = useRef(null);

  const [complaintNo, setComplaintNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [customer_id, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [phone, setPhone] = useState("+91");
  const [phoneError, setPhoneError] = useState("");
  const [alternateNumber, setAlternateNumber] = useState("");

  const [customerFound, setCustomerFound] = useState(null);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [address, setAddress] = useState("");
  const [company, setCompany] = useState("");
  const [details, setDetails] = useState("");
  const [customerType, setCustomerType] = useState("our_customer");
  const [products, setProducts] = useState([]);
  const [productRemarks, setProductRemarks] = useState("");
  const [warrantyPhoto, setWarrantyPhoto] = useState(null);
  const [warrantyDate, setWarrantyDate] = useState("");
  const [nextServiceDate, setNextServiceDate] = useState("");
  const [productName, setProductName] = useState("");
  const [formError, setFormError] = useState("");

  // ---------------------------------------------------
  // 🔥 FETCH COMPLAINT NUMBER FROM BACKEND
  // ---------------------------------------------------
  useEffect(() => {
    const fetchComplaintNo = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/user/bookservice/preview/`);
        const text = await response.text();

        try {
          const result = JSON.parse(text);
          if (result.complaint_no) setComplaintNo(result.complaint_no);
        } catch {
          console.log("Invalid JSON from backend:", text);
        }
      } catch (error) {
        console.log("Error fetching complaint no:", error);
      }
    };
    fetchComplaintNo();
  }, []);

  // ---------------------------------------------------
  // 🔥 FETCH PRODUCTS FROM BACKEND
  // ---------------------------------------------------
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/user/products/`);
        const result = await response.json();
        if (Array.isArray(result)) {
          setProducts(result);
        }
      } catch (error) {
        console.log("Error fetching products:", error);
      }
    };
    fetchProducts();
  }, []);

  // -------------------------
  // Email Validation
  // -------------------------
  const handleEmailChange = (text: string) => {
    setCustomerEmail(text);
    setEmailError(
      text.endsWith("@gmail.com")
        ? ""
        : "Email must end with @gmail.com"
    );
  };
  // -------------------------
  // Phone Validation & Verification
  // -------------------------
  const handlePhoneChange = async (text: string) => {
    if (!text.startsWith("+91")) return;

    const num = text.slice(3);
    if (num.length <= 10 && /^\d*$/.test(num)) {
      setPhone(text);
      setPhoneError(num.length === 10 ? "" : "Phone must be 10 digits");

      if (num.length === 10) {
        setPhoneError("");
        await verifyPhoneNumber(num);
      } else {
        setCustomerFound(null);
      }
    }
  };

  const verifyPhoneNumber = async (number: string) => {
    setIsVerifyingPhone(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/customer-by-phone/?phone=${number}`);
      const result = await response.json();
      if (result.found) {
        setCustomerName(result.customer_name || "");
        setCustomerEmail(result.customer_email || "");
        setAddress(result.address || "");
        setCustomerType(result.customer_type || "our_customer");
        setCustomerFound(true);
      } else {
        setCustomerFound(false);
      }
    } catch {
      setCustomerFound(false);
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  // -------------------------
  // Warranty Photo Picker
  // -------------------------
  const pickWarrantyPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const fileName = asset.uri.split('/').pop();
      const fileType = asset.type || 'image/jpeg';

      const photoData = {
        uri: asset.uri,
        name: fileName,
        type: fileType,
      };

      setWarrantyPhoto(photoData);
    }
  };

  // -------------------------
  // Submit Form
  // -------------------------
  const handleSubmit = async () => {
    if (!customerName || !customerEmail || !phone || !address || !details) {
      setFormError("Please fill all required fields.");
      return;
    }

    if (!customerEmail.endsWith("@gmail.com")) {
      setEmailError("Email must end with @gmail.com");
      return;
    }

    if (phone.slice(3).length !== 10) {
      setPhoneError("Phone must be 10 digits");
      return;
    }

    try {
      let requestData;
      let headers = {};

      // Use FormData if warranty photo is present
      if (warrantyPhoto) {
        requestData = new FormData();
        requestData.append("complaint_no", complaintNo);
        requestData.append("company", company || "");
        requestData.append("customer_name", customerName);
        requestData.append("customer_email", customerEmail);
        requestData.append("customer_id", customer_id || "");
        requestData.append("phone", phone.slice(3)); // Remove +91 prefix
        requestData.append("alternate_number", alternateNumber || "");
        requestData.append("address", address);
        // Product ID removed as requested
        requestData.append("product_id", productId || "");
        requestData.append("product_name", productName);
        requestData.append("product_remarks", productRemarks || "");
        requestData.append("details", details);
        requestData.append("customer_type", customerType);

        // Note: Warranty photo will be uploaded separately after complaint creation

        if (warrantyDate) requestData.append("warranty_date", warrantyDate);
        if (nextServiceDate) requestData.append("next_service_date", nextServiceDate);
      } else {
        // Use JSON for regular requests
        headers = { "Content-Type": "application/json" };
        requestData = JSON.stringify({
          complaint_no: complaintNo,
          company: company || "",
          customer_name: customerName,
          customer_email: customerEmail,
          customer_id: customer_id || "",
          phone: phone.slice(3), // Remove +91 prefix
          alternate_number: alternateNumber || "",
          address,
          product_id: productId || null,
          product_name: productName,
          product_remarks: productRemarks || "",
          details,
          customer_type: customerType,
          warranty_date: warrantyDate || null,
          next_service_date: nextServiceDate || null,
        });
      }

      const response = await fetch(`${API_BASE_URL}/api/user/bookservice/`, {
        method: "POST",
        headers,
        body: requestData,
      });

      const result = await response.json();

      if (response.ok) {
        const complaintNo = result.complaint_no;

        // Upload warranty photo if present
        if (warrantyPhoto) {
          try {
            const photoFormData = new FormData();
            photoFormData.append("file", {
              uri: warrantyPhoto.uri,
              name: warrantyPhoto.name,
              type: warrantyPhoto.type,
            } as any);

            const photoResponse = await fetch(
              `${API_BASE_URL}/api/user/complaints/${complaintNo}/upload-warranty/`,
              {
                method: "POST",
                body: photoFormData,
              }
            );

            if (!photoResponse.ok) {
              console.log("Warranty photo upload failed, but complaint created");
            }
          } catch (photoError) {
            console.log("Warranty photo upload error:", photoError);
          }
        }

        alert(`Complaint ${complaintNo} registered successfully.`);

        router.push({
          pathname: "vdesk/Selectstaff",
          params: { complaintNo },
        });
      } else {
        console.log("Backend errors:", result);
        if (result.errors) {
          const firstErr = Object.entries(result.errors)[0];
          setFormError(`${firstErr[0]}: ${firstErr[1]}`);
        } else if (result.error) {
          setFormError(result.error);
        } else {
          setFormError("Failed to submit service request. Please check fields.");
        }
      }
    } catch (error) {
      console.error("Submission error:", error);
      setFormError("Network error. Try again later.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AnimatedOrbs count={18} />

      {/* HEADER */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Book Service</Text>
        <Text style={styles.headerSubtitle}>Submit your service request</Text>
      </View>

      <KeyboardAvoidingView style={styles.keyboardAvoidView} behavior="padding">
        <ScrollView style={styles.scrollWrapper} contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>

            <View style={styles.cardHeader}>
              <Feather name="file-text" size={24} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Service Request Form</Text>
            </View>

            {/* Complaint Number */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Complaint Number</Text>
              <View style={styles.inputContainer}>
                <Feather name="hash" size={20} color={COLORS.accent} />
                <TextInput style={styles.input} value={complaintNo} editable={false} />
              </View>
            </View>

            {/* Customer Name */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputContainer}>
                <Feather name="user" size={20} color={COLORS.accent} />
                <TextInput
                  placeholder="Enter your full name"
                  style={styles.input}
                  value={customerName}
                  onChangeText={setCustomerName}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Feather name="mail" size={20} color={COLORS.accent} />
                <TextInput
                  placeholder="Enter your email"
                  style={styles.input}
                  value={customerEmail}
                  onChangeText={handleEmailChange}
                />
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            {/* Customer ID (Optional) */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Customer ID (Optional)</Text>
              <View style={styles.inputContainer}>
                <Feather name="user-check" size={20} color={COLORS.accent} />
                <TextInput
                  placeholder="Enter customer ID (optional)"
                  style={styles.input}
                  value={customer_id}
                  onChangeText={setCustomerId}
                />
              </View>
            </View>

            {/* Company */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Company Name</Text>
              <View style={styles.inputContainer}>
                <Feather name="briefcase" size={20} color={COLORS.accent} />
                <TextInput
                  placeholder="Enter company name"
                  style={styles.input}
                  value={company}
                  onChangeText={setCompany}
                />
              </View>
            </View>



            {/* Phone Number */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <View style={styles.inputContainer}>
                <Feather name="phone" size={20} color={COLORS.accent} />
                <TextInput
                  placeholder="Enter phone number"
                  style={styles.input}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  maxLength={13}
                />
              </View>
              {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
              {isVerifyingPhone && (
                <Text style={styles.info}>Verifying phone number...</Text>
              )}
              {customerFound === true && (
                <Text style={styles.success}>Customer auto-filled</Text>
              )}
              {customerFound === false && (
                <Text style={styles.muted}>New customer</Text>
              )}
            </View>

            {/* Alternate Phone Number */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Alternate Phone Number</Text>
              <View style={styles.inputContainer}>
                <Feather name="phone-call" size={20} color={COLORS.accent} />
                <TextInput
                  placeholder="+91xxxxxxxxxx"
                  style={styles.input}
                  value={alternateNumber}
                  onChangeText={setAlternateNumber}
                  keyboardType="phone-pad"
                  maxLength={13}
                />
              </View>
            </View>



            {/* Customer Type */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Customer Type</Text>
              <View style={styles.inputContainer}>
                <Feather name="users" size={20} color={COLORS.accent} />
                <View style={{ flex: 1 }}>
                  <RNPickerSelect
                    value={customerType}
                    onValueChange={setCustomerType}
                    items={[
                      { label: "Our Customer", value: "our_customer" },
                      { label: "External Customer", value: "external_customer" },
                    ]}
                    style={pickerSelectStyles}
                    useNativeAndroidPickerStyle={false}
                    placeholder={{ label: "Select customer type", value: null }}
                  />
                </View>
              </View>
            </View>

            {/* Product Selection from API */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Product</Text>
              <View style={styles.inputContainer}>
                <Feather name="package" size={20} color={COLORS.accent} />
                <View style={{ flex: 1 }}>
                  <RNPickerSelect
                    value={productId}
                    onValueChange={(value) => {
                      setProductId(value);
                      if (value) {
                        const selected = products.find((p: any) => p.id.toString() === value);
                        if (selected) setProductName(selected.product_name);
                      }
                    }}
                    items={products.map((p: any) => ({
                      label: p.product_name,
                      value: p.id.toString(),
                    }))}
                    style={pickerSelectStyles}
                    useNativeAndroidPickerStyle={false}
                    placeholder={{ label: "Select product", value: null }}
                  />
                </View>
              </View>
            </View>

            {/* Product Remarks */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Product Remarks</Text>
              <View style={styles.inputContainer}>
                <Feather name="message-square" size={20} color={COLORS.accent} />
                <TextInput
                  placeholder="Additional notes about the product..."
                  style={[styles.input, styles.multiline]}
                  value={productRemarks}
                  onChangeText={setProductRemarks}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>

            {/* Address */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Address</Text>
              <View style={styles.inputContainer}>
                <Feather name="map-pin" size={20} color={COLORS.accent} />
                <TextInput
                  placeholder="Enter address"
                  style={[styles.input, styles.multiline]}
                  value={address}
                  onChangeText={setAddress}
                  multiline
                />
              </View>
            </View>

            {/* Details */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Issue Description *</Text>
              <View style={styles.inputContainer}>
                <Feather name="alert-circle" size={20} color={COLORS.accent} />
                <TextInput
                  placeholder="Describe the issue"
                  style={[styles.input, styles.multiline]}
                  value={details}
                  onChangeText={setDetails}
                  multiline
                />
              </View>
            </View>

            {/* Warranty Section (for our customers only) */}
            {customerType === "our_customer" && (
              <View style={styles.warrantySection}>
                <Text style={styles.sectionTitle}>Warranty Information</Text>

                {/* Warranty Date */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Warranty Expiry Date</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="calendar" size={20} color={COLORS.accent} />
                    <TextInput
                      placeholder="YYYY-MM-DD"
                      style={styles.input}
                      value={warrantyDate}
                      onChangeText={setWarrantyDate}
                    />
                  </View>
                </View>

                {/* Warranty Photo Upload */}
                <TouchableOpacity style={styles.uploadButton} onPress={pickWarrantyPhoto}>
                  <Feather name="camera" size={16} color={COLORS.white} />
                  <Text style={styles.uploadText}>
                    {warrantyPhoto ? "Change Warranty Photo" : "Upload Warranty Photo"}
                  </Text>
                </TouchableOpacity>

                {warrantyPhoto && (
                  <View style={styles.photoPreview}>
                    <Image
                      source={{ uri: warrantyPhoto.uri }}
                      style={styles.previewImage}
                    />
                    <Text style={styles.photoText}>Warranty photo selected</Text>
                  </View>
                )}
              </View>
            )}

            {/* Next Service Date */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Next Service Date</Text>
              <View style={styles.inputContainer}>
                <Feather name="clock" size={20} color={COLORS.accent} />
                <TextInput
                  placeholder="YYYY-MM-DD"
                  style={styles.input}
                  value={nextServiceDate}
                  onChangeText={setNextServiceDate}
                />
              </View>
            </View>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            {/* SUBMIT BUTTON */}
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Feather name="send" size={20} color={COLORS.white} />
              <Text style={styles.submitButtonText}>Submit Service Request</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  keyboardAvoidView: { flex: 1 },
  headerSection: {
    backgroundColor: COLORS.header,
    marginHorizontal: 16,
    marginTop: 16,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    alignItems: "center",
  },
  headerTitle: { fontSize: SIZES.h1, fontWeight: "bold", color: COLORS.white },
  headerSubtitle: { fontSize: SIZES.body, color: COLORS.white, marginTop: 8 },
  scrollWrapper: { flex: 1 },
  scrollContent: { padding: SIZES.padding, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 24,
    borderRadius: SIZES.radius,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  cardTitle: { fontSize: SIZES.h2, fontWeight: "bold", marginLeft: 12, color: COLORS.primary },
  inputWrapper: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  input: { flex: 1, fontSize: SIZES.body },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: SIZES.radius,
  },
  submitButtonText: { color: COLORS.white, fontSize: 16, fontWeight: "bold", marginLeft: 8 },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 4, marginLeft: 8 },
  info: { color: COLORS.primary, fontSize: 12, marginTop: 4, marginLeft: 8 },
  success: { color: COLORS.success, fontSize: 12, marginTop: 4, marginLeft: 8 },
  muted: { color: COLORS.muted, fontSize: 12, marginTop: 4, marginLeft: 8 },
  warrantySection: {
    backgroundColor: COLORS.panel,
    padding: 16,
    borderRadius: SIZES.radius,
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: SIZES.h3,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 12,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: SIZES.radius,
    marginTop: 8,
  },
  uploadText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  photoPreview: {
    marginTop: 12,
    alignItems: "center",
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: SIZES.radius,
    marginBottom: 8,
  },
  photoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
});
