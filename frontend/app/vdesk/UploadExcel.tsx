import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import axios from "axios";
import API_BASE_URL from "../../config";


    type ExcelFile = {
    uri: string;
    name: string;
    mimeType: string;
  };
/* ===== UI CONSTANTS ===== */

const COLORS = {
  background: "#6addf7ff",
  header: "#12b5d9ff",
  surface: "#ffffff",
  primary: "#007bff",
  success: "#399a43ff",
  danger: "#eb5968ff",
  textPrimary: "#000",
  textSecondary: "#555",
};

const SIZES = {
  radius: 16,
  padding: 16,
};

export default function UploadExcel() {
  const [file, setFile] = useState<ExcelFile | null>(null);


  /* ================= PICK FILE ================= */

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const pickedFile = result.assets?.[0] || result;

        if (!pickedFile?.uri) {
          Alert.alert("Invalid file selected");
          return;
        }

        const safeFile = {
          uri: pickedFile.uri,
          name: pickedFile.name || "excel_file.xlsx",
          mimeType:
            pickedFile.mimeType ||
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        };

        setFile(safeFile);
      }
    } catch (err) {
      console.log("Picker Error:", err);
      Alert.alert("Error picking file");
    }
  };

  /* ================= UPLOAD FILE ================= */

  const uploadFile = async () => {
    if (!file) {
      Alert.alert("Please select an Excel file");
      return;
    }

  const formData = new FormData();

  if (!file) return;

  formData.append(
    "file",
    {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as any // 👈 REQUIRED for React Native
  );

    try {
      const res = await axios.post(`${API_BASE_URL}/api/user/import-excel/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Accept: "application/json",
          },
        }
      );

      Alert.alert("Success", "Excel uploaded successfully");
      console.log(res.data);
      setFile(null);
    } catch (error: any) {
      console.log("Upload Error:", error?.response?.data || error.message);
      Alert.alert(
        "Upload Failed",
        error?.response?.data?.error || "Check your Django server"
      );
    }
  };

  /* ================= RENDER ================= */

  return (
    <View style={styles.container}>
      {/* HEADER CARD */}
      <View style={styles.headerCard}>
        <Text style={styles.headerText}>Upload Excel</Text>
        <Text style={styles.subHeaderText}>
          Import data from Excel file
        </Text>
      </View>

      {/* MAIN CARD */}
      <View style={styles.card}>
        {/* PICK BUTTON */}
        <TouchableOpacity style={styles.pickBtn} onPress={pickFile}>
          <Text style={styles.pickBtnText}>📂 Pick Excel File</Text>
        </TouchableOpacity>

        {/* FILE PREVIEW */}
        {file && (
          <View style={styles.fileCard}>
            <Text style={styles.fileLabel}>Selected File</Text>
            <Text style={styles.fileName}>{file.name}</Text>
          </View>
        )}

        {/* UPLOAD BUTTON */}
        <TouchableOpacity
          style={[
            styles.uploadBtn,
            !file && styles.uploadBtnDisabled,
          ]}
          onPress={uploadFile}
          disabled={!file}
        >
          <Text style={styles.uploadBtnText}>⬆ Upload to Server</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
    justifyContent: "center",
  },

  headerCard: {
    backgroundColor: COLORS.header,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: 20,
    alignItems: "center",
  },

  headerText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },

  subHeaderText: {
    color: "#e8f8ff",
    fontSize: 14,
    marginTop: 4,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  pickBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  pickBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  fileCard: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f1f9ff",
  },

  fileLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  fileName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 4,
  },

  uploadBtn: {
    backgroundColor: COLORS.success,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  uploadBtnDisabled: {
    backgroundColor: "#9acfa8",
  },

  uploadBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
