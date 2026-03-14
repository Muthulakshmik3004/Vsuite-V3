import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import axios from "axios";
import  API_BASE_URL from "../../config";

export default function SendEmailScreen() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSendEmail = async () => {
    if (!to || !subject || !message) {
      return Alert.alert("Error", "All fields are required");
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/api/user/send-email/`, { to, subject, message });
      if (res.data.success) {
        Alert.alert("Success", "Email sent successfully!");
        setTo("");
        setSubject("");
        setMessage("");
      } else {
        Alert.alert("Error", res.data.error || "Failed to send email");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to send email");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📧 Send Email via Gmail</Text>

      <TextInput placeholder="To (email)" style={styles.input} value={to} onChangeText={setTo} />
      <TextInput placeholder="Subject" style={styles.input} value={subject} onChangeText={setSubject} />
      <TextInput
        placeholder="Message"
        style={[styles.input, { height: 120 }]}
        multiline
        value={message}
        onChangeText={setMessage}
      />

      <TouchableOpacity style={styles.button} onPress={handleSendEmail}>
        <Text style={styles.buttonText}>Send Email</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f9f9f9" },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
