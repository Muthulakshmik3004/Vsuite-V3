import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import CONFIG_API_BASE_URL from "../config";
import * as LocalAuthentication from "expo-local-authentication";

const API_BASE_URL = `${CONFIG_API_BASE_URL}`;

const AdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetStep, setResetStep] = useState("email"); // "email" | "otp" | "password"
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const router = useRouter();

  // ⭐ AUTO FINGERPRINT LOGIN WHEN PAGE OPENS
  // ---------------------------------------------------------
  useEffect(() => {
    const autoFingerprintLogin = async () => {
      try {
        const savedLogin = await AsyncStorage.getItem("lastLogin");
        const allowAuto = await AsyncStorage.getItem("allowAutoFingerprint");

        if (!savedLogin) return;
        if (allowAuto !== "true") return;

        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (!hasHardware || !isEnrolled) return;

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Login with Fingerprint",
          fallbackLabel: "Use Passcode",
          requireConfirmation: false,
        });

        if (result.success) {
          const { username: savedUser, password: savedPass } = JSON.parse(savedLogin);
          handleLogin(savedUser, savedPass);
        }

      } catch (err) {
        console.log("AUTO BIO ERROR:", err);
      }
    };

    setTimeout(() => {
      autoFingerprintLogin();
    }, 800);

  }, []);
  // ---------------------------------------------------------

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // ⭐ Manual fingerprint authentication
  const handleBiometricAuth = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware) {
        Alert.alert("Biometric Not Supported", "Your device does not support biometrics.");
        return false;
      }

      if (!isEnrolled) {
        Alert.alert("No Biometrics Found", "Please set up biometrics on your device first.");
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to Login",
        fallbackLabel: "Use passcode",
        requireConfirmation: false,
      });

      return result.success;
    } catch (error) {
      console.error("Biometric Auth Error:", error);
      return false;
    }
  };

  // 🔐 Handle Login (supports both manual and auto login)
  const handleLogin = async (autoUser = username, autoPass = password) => {
    if (!autoUser || !autoPass) {
      Alert.alert("Error", "Please enter both username and password.");
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/api/admin-login/`, {
        username: autoUser,
        password: autoPass,
      });

      if (res.data.status === "success") {
        // Store admin user data in AsyncStorage
        const adminData = {
          username: res.data.data.username,
          name: res.data.data.name,
          role: res.data.data.role,
          image: res.data.data.image
        };
        
        await AsyncStorage.setItem("user", JSON.stringify(adminData));
        await AsyncStorage.setItem("lastLogin", JSON.stringify({ username: autoUser, password: autoPass }));
        await AsyncStorage.setItem("allowAutoFingerprint", "true");
        
        router.replace("/adminint");
      } else {
        Alert.alert("Login Failed", res.data.message || "Invalid credentials");
      }
    } catch (err) {
      Alert.alert("Login Failed", err.response?.data?.message || "Something went wrong");
    }
  };

  // 🎨 Animations
  const handlePressIn = () => {
    Animated.spring(scaleValue, { toValue: 0.95, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // Step 1️⃣ → Send OTP
  const handleSendOtp = async () => {
    if (!resetEmail) {
      Alert.alert("Error", "Please enter your registered email");
      return;
    }
    try {
      const response = await axios.post(`${API_BASE_URL}/api/admin-forgot-password/`, {
        email: resetEmail, // ✅ Ensure your Django view expects `email`
      });

      if (response.data.status === "success" || response.data.success) {
        Alert.alert("Success", "OTP sent to your registered email.");
        setResetStep("otp");
      } else {
        Alert.alert("Failed", response.data.message || "Unable to send OTP.");
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Something went wrong.");
    }
  };

  // Step 2️⃣ → Verify OTP
  const handleVerifyOtp = async () => {
    if (!otp) {
      Alert.alert("Error", "Please enter the OTP you received");
      return;
    }
    try {
      const response = await axios.post(`${API_BASE_URL}/api/admin-verify-otp/`, {
        email: resetEmail, // ✅ Changed to `email` for consistency with backend
        otp,
      });

      if (response.data.status === "success" || response.data.success) {
        Alert.alert("Success", "OTP verified successfully.");
        setResetStep("password");
      } else {
        Alert.alert("Error", response.data.message || "Invalid OTP.");
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Something went wrong.");
    }
  };

  // Step 3️⃣ → Reset Password
  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Error", "Please enter and confirm your new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/admin-reset-password/`, {
        email: resetEmail, // ✅ Changed from username → email
        new_password: newPassword,
      });

      if (response.data.status === "success" || response.data.success) {
        Alert.alert("Success", "Password reset successfully!");
        setShowForgotModal(false);
        setResetStep("email");
        setResetEmail("");
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        Alert.alert("Error", response.data.message || "Password reset failed.");
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Something went wrong.");
    }
  };

  // ⭐ Manual fingerprint login button
  const handleFingerprintLogin = async () => {
    const biometricSuccess = await handleBiometricAuth();

    if (!biometricSuccess) {
      Alert.alert("Authentication Failed", "Fingerprint not verified.");
      return;
    }

    const saved = await AsyncStorage.getItem("lastLogin");
    if (!saved) {
      Alert.alert("No Saved Login", "Please login once using username & password.");
      return;
    }

    const { username: savedUser, password: savedPass } = JSON.parse(saved);

    handleLogin(savedUser, savedPass);
  };

  const handleCloseModal = () => {
    setShowForgotModal(false);
    setResetStep("email");
    setResetEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={["#ec407a", "#641b9a"]} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Animated.View style={{ opacity: fadeAnim, width: "100%", alignItems: "center" }}>
            <Text style={styles.title}>Admin Login</Text>

            {/* Username Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={username}
                onChangeText={setUsername}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.7)"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
              <TouchableOpacity onPress={() => handleLogin()} onPressIn={handlePressIn} onPressOut={handlePressOut}>
                <LinearGradient colors={["#f48fb1", "#c2185b"]} style={styles.button}>
                  <Text style={styles.buttonText}>Login</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* ⭐ Manual fingerprint login button */}
            <TouchableOpacity onPress={handleFingerprintLogin} style={{ marginTop: 25 }}>
              <Ionicons name="finger-print" size={50} color="white" />
            </TouchableOpacity>
            <Text style={{ color: 'white', marginTop: 5 }}>Login with Fingerprint</Text>

            <TouchableOpacity onPress={() => setShowForgotModal(true)} style={styles.forgotContainer}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </LinearGradient>

      {/* 🔐 Forgot Password Modal */}
      <Modal visible={showForgotModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {resetStep === "email" && (
              <>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter your registered email"
                  placeholderTextColor="#aaa"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                />
                <TouchableOpacity onPress={handleSendOtp} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Send OTP</Text>
                </TouchableOpacity>
              </>
            )}

            {resetStep === "otp" && (
              <>
                <Text style={styles.modalTitle}>Enter OTP</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter the OTP sent to your email"
                  placeholderTextColor="#aaa"
                  keyboardType="numeric"
                  value={otp}
                  onChangeText={setOtp}
                />
                <TouchableOpacity onPress={handleVerifyOtp} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Verify OTP</Text>
                </TouchableOpacity>
              </>
            )}

            {resetStep === "password" && (
              <>
                <Text style={styles.modalTitle}>Set New Password</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="New Password"
                  placeholderTextColor="#aaa"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Confirm Password"
                  placeholderTextColor="#aaa"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={handleResetPassword} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Reset Password</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={handleCloseModal} style={[styles.modalButton, { backgroundColor: "#aaa" }]}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 35, fontWeight: "bold", color: "white", marginBottom: 40, textAlign: "center" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 55,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 15,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  input: { flex: 1, color: "white", fontSize: 16 },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 80,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  buttonText: { color: "white", fontSize: 18, fontWeight: "bold" },
  forgotContainer: { marginTop: 15 },
  forgotText: { color: "white", fontSize: 15, textDecorationLine: "underline" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContainer: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 15, color: "#333" },
  modalInput: {
    width: "100%",
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
    marginBottom: 20,
  },
  modalButton: {
    width: "100%",
    backgroundColor: "#c2185b",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 5,
  },
  modalButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
});

export default AdminLogin;
