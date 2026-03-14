import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import axios from "axios";
import API_BASE_URL from "../../config";

const COLORS = {
  background: "#6addf7ff",
  header: "#12b5d9ff",
  surface: "#9ad7ecff",
  primary: "#007bff",
  accent: "#2694a8ff",
  success: "#399a43ff",
  danger: "#eb5968ff",
  textPrimary: "#000000",
  textSecondary: "#555555",
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

const ProductPage = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [newProduct, setNewProduct] = useState({ product_name: "", description: "" });
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<any>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/user/products/`);
      setProducts(res.data);
    } catch (err) {
      console.error("Error loading products:", err);
    }
  };

  const createProduct = async () => {
    if (!newProduct.product_name.trim()) {
      Alert.alert("Error", "Please enter a product name!");
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/api/user/products/create/`, newProduct);
      Alert.alert("Success", "Product created successfully!");
      setNewProduct({ product_name: "", description: "" });
      fetchProducts();
    } catch (err) {
      Alert.alert("Error", "Failed to create product!");
    }
  };

  const updateProduct = async () => {
    if (!editingProduct.product_name.trim()) {
      Alert.alert("Error", "Please enter a product name!");
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/api/user/products/${editingProduct.id}/update/`, editingProduct);
      Alert.alert("Success", "Product updated successfully!");
      setEditModalVisible(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      Alert.alert("Error", "Failed to update product!");
    }
  };

  const deleteProduct = async (productId: any, productName: any) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete ${productName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE_URL}/api/user/products/${productId}/delete/`);
              Alert.alert("Success", "Product deleted successfully!");
              fetchProducts();
            } catch (err) {
              Alert.alert("Error", "Failed to delete product!");
            }
          },
        },
      ]
    );
  };

  const openEditModal = (product: any) => {
    setEditingProduct({ ...product });
    setEditModalVisible(true);
  };

  const openViewModal = (product: any) => {
    setViewingProduct(product);
    setViewModalVisible(true);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Product Management</Text>
        <Text style={styles.headerSubtitle}>Manage products</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="plus" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Add New Product</Text>
          </View>

          <TextInput
            style={styles.input}
            value={newProduct.product_name}
            onChangeText={(text) => setNewProduct({ ...newProduct, product_name: text })}
            placeholder="Enter product name"
          />

          <TextInput
            style={styles.input}
            value={newProduct.description}
            onChangeText={(text) => setNewProduct({ ...newProduct, description: text })}
            placeholder="Enter product description (optional)"
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={createProduct}
          >
            <Feather name="plus" size={16} color={COLORS.white} />
            <Text style={styles.buttonText}>Create Product</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="package" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Existing Products</Text>
          </View>

          {products.length > 0 ? (
            products.map((product) => (
              <View key={product.id} style={styles.productRow}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.product_name}</Text>
                  {product.description && (
                    <Text style={styles.productDescription}>{product.description}</Text>
                  )}
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => openViewModal(product)}
                  >
                    <Feather name="eye" size={16} color={COLORS.white} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => openEditModal(product)}
                  >
                    <Feather name="edit-2" size={16} color={COLORS.white} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => {
                      console.log("Deleting product:", product.product_name, product.id);
                      deleteProduct(product.id, product.product_name);
                    }}
                  >
                    <Feather name="trash-2" size={16} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Feather name="package" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          )}
        </View>
      </View>

      {/* EDIT PRODUCT MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Product</Text>

            <TextInput
              style={styles.input}
              value={editingProduct?.product_name || ""}
              onChangeText={(text) => setEditingProduct({ ...editingProduct, product_name: text })}
              placeholder="Enter product name"
            />

            <TextInput
              style={styles.input}
              value={editingProduct?.description || ""}
              onChangeText={(text) => setEditingProduct({ ...editingProduct, description: text })}
              placeholder="Enter product description (optional)"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={updateProduct}
              >
                <Text style={styles.submitButtonText}>Update Product</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* VIEW PRODUCT MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={viewModalVisible}
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Product Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Product Name:</Text>
              <Text style={styles.detailValue}>{viewingProduct?.product_name}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Description:</Text>
              <Text style={styles.detailValue}>{viewingProduct?.description || "No description"}</Text>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, styles.closeButton]}
              onPress={() => setViewModalVisible(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

/* ================================
   STYLES SAME AS BOOKING PAGE 
   ================================ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  headerSection: {
    backgroundColor: COLORS.header,
    padding: 24,
    borderRadius: SIZES.radius,
    alignItems: "center",
    marginBottom: 20,
  },

  headerTitle: {
    color: COLORS.white,
    fontSize: SIZES.h1,
    fontWeight: "bold",
  },

  headerSubtitle: {
    color: COLORS.white,
    marginTop: 6,
  },

  content: {
    padding: SIZES.padding,
  },

  card: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: SIZES.radius,
    marginBottom: 20,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: SIZES.h2,
    fontWeight: "bold",
    color: COLORS.primary,
    marginLeft: 8,
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: SIZES.radius,
  },

  primaryButton: {
    backgroundColor: COLORS.primary,
    marginTop: 16,
  },

  buttonText: {
    color: COLORS.white,
    fontSize: SIZES.body,
    fontWeight: "bold",
    marginLeft: 8,
  },

  input: {
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.accent,
    fontSize: SIZES.body,
    marginBottom: 12,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },

  emptyText: {
    fontSize: SIZES.h2,
    color: COLORS.textSecondary,
    marginTop: 16,
  },

  productRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: SIZES.radius,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  productInfo: {
    flex: 1,
  },

  productName: {
    fontSize: SIZES.h3,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },

  productDescription: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  productActions: {
    flexDirection: "row",
    gap: 8,
  },

  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: SIZES.radius,
    alignItems: "center",
    justifyContent: "center",
  },

  editButton: {
    backgroundColor: COLORS.primary,
  },

  viewButton: {
    backgroundColor: COLORS.success,
  },

  deleteButton: {
    backgroundColor: COLORS.danger,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContent: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: SIZES.radius,
    width: "90%",
    maxWidth: 400,
  },

  modalTitle: {
    fontSize: SIZES.h2,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 20,
    textAlign: "center",
  },

  modalButtons: {
    flexDirection: "row",
    gap: 10,
  },

  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.danger,
    alignItems: "center",
  },

  cancelButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },

  submitButton: {
    flex: 1,
    padding: 12,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.primary,
    alignItems: "center",
  },

  submitButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
  },

  detailLabel: {
    fontSize: SIZES.body,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    flex: 1,
  },

  detailValue: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    flex: 2,
    textAlign: "right",
  },

  closeButton: {
    marginTop: 20,
  },
});

export default ProductPage;
