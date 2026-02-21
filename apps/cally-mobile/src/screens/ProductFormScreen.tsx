import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import {
  createProduct,
  updateProduct,
  uploadProductImage,
} from "../services/products";
import type { Product, ProductImage } from "../services/products";
import type { RootStackParamList } from "../navigation/AppNavigator";
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
} from "../config/theme";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, "ProductForm">;

const COLOR_OPTIONS = [
  { hex: "#6366f1", label: "Indigo" },
  { hex: "#3b82f6", label: "Blue" },
  { hex: "#22c55e", label: "Green" },
  { hex: "#eab308", label: "Yellow" },
  { hex: "#f97316", label: "Orange" },
  { hex: "#ec4899", label: "Pink" },
];

export default function ProductFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { accessToken, refreshAccessToken } = useAuth();

  const isEdit = route.params.mode === "edit";
  const existing = route.params.mode === "edit" ? route.params.product : null;

  const [name, setName] = useState(existing?.name || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [durationMinutes, setDurationMinutes] = useState(
    existing?.durationMinutes?.toString() || "60",
  );
  const [price, setPrice] = useState(
    existing ? (existing.price / 100).toFixed(2) : "",
  );
  const [selectedColor, setSelectedColor] = useState(existing?.color || "");
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [images, setImages] = useState<ProductImage[]>(existing?.images || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handlePickImage = useCallback(async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library to upload images.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    if (!accessToken) return;

    setIsUploading(true);
    try {
      let response = await uploadProductImage(uri, accessToken);

      if (
        !response.success &&
        (response.error?.includes("expired") ||
          response.error?.includes("authenticated"))
      ) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await uploadProductImage(uri, newToken);
        }
      }

      if (response.success && response.data) {
        const newImage: ProductImage = {
          id: Date.now().toString(),
          url: response.data.url,
        };
        setImages((prev) => [...prev, newImage]);
      } else {
        Alert.alert("Error", response.error || "Failed to upload image");
      }
    } catch (err) {
      console.error("[DBG][ProductFormScreen] Upload error:", err);
      Alert.alert("Error", "Something went wrong uploading the image.");
    } finally {
      setIsUploading(false);
    }
  }, [accessToken, refreshAccessToken]);

  const handleRemoveImage = useCallback((imageId: string) => {
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  }, []);

  const handleSave = useCallback(async () => {
    if (!accessToken) return;

    // Validate
    if (!name.trim()) {
      Alert.alert("Validation", "Product name is required.");
      return;
    }
    const duration = parseInt(durationMinutes, 10);
    if (isNaN(duration) || duration < 5 || duration > 480) {
      Alert.alert("Validation", "Duration must be between 5 and 480 minutes.");
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert("Validation", "Price must be a non-negative number.");
      return;
    }

    setIsSaving(true);
    try {
      const priceCents = Math.round(priceNum * 100);

      if (isEdit && existing) {
        const updates: Record<string, unknown> = {
          name: name.trim(),
          description: description.trim() || undefined,
          durationMinutes: duration,
          price: priceCents,
          color: selectedColor || undefined,
          images,
          isActive,
        };

        let response = await updateProduct(existing.id, updates, accessToken);
        if (
          !response.success &&
          (response.error?.includes("expired") ||
            response.error?.includes("authenticated"))
        ) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            response = await updateProduct(existing.id, updates, newToken);
          }
        }

        if (response.success) {
          navigation.goBack();
        } else {
          Alert.alert("Error", response.error || "Failed to update product");
        }
      } else {
        const input = {
          name: name.trim(),
          description: description.trim() || undefined,
          durationMinutes: duration,
          price: priceCents,
          color: selectedColor || undefined,
          images,
          isActive,
        };

        let response = await createProduct(input, accessToken);
        if (
          !response.success &&
          (response.error?.includes("expired") ||
            response.error?.includes("authenticated"))
        ) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            response = await createProduct(input, newToken);
          }
        }

        if (response.success) {
          navigation.goBack();
        } else {
          Alert.alert("Error", response.error || "Failed to create product");
        }
      }
    } catch (err) {
      console.error("[DBG][ProductFormScreen] Save error:", err);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [
    accessToken,
    refreshAccessToken,
    navigation,
    isEdit,
    existing,
    name,
    description,
    durationMinutes,
    price,
    selectedColor,
    images,
    isActive,
  ]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEdit ? "Edit Product" : "New Product"}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          activeOpacity={0.7}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Hair Cut, Yoga Session"
            placeholderTextColor={colors.textMuted}
          />

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Brief description of this service"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Images */}
          <Text style={styles.label}>Images</Text>
          <View style={styles.imagesRow}>
            {images.map((img) => (
              <View key={img.id} style={styles.imageThumb}>
                <Image source={{ uri: img.url }} style={styles.imageThumbImg} />
                <TouchableOpacity
                  style={styles.imageRemoveBtn}
                  onPress={() => handleRemoveImage(img.id)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.error}
                  />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.addImageBtn}
              onPress={handlePickImage}
              disabled={isUploading}
              activeOpacity={0.7}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons
                  name="camera-outline"
                  size={24}
                  color={colors.primary}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Duration */}
          <Text style={styles.label}>Duration (minutes) *</Text>
          <TextInput
            style={styles.input}
            value={durationMinutes}
            onChangeText={setDurationMinutes}
            placeholder="60"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
          />

          {/* Price */}
          <Text style={styles.label}>Price ($) *</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />

          {/* Color */}
          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {COLOR_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c.hex}
                style={[
                  styles.colorOption,
                  { backgroundColor: c.hex },
                  selectedColor === c.hex && styles.colorOptionSelected,
                ]}
                onPress={() =>
                  setSelectedColor(selectedColor === c.hex ? "" : c.hex)
                }
                activeOpacity={0.7}
              >
                {selectedColor === c.hex && (
                  <Ionicons name="checkmark" size={16} color={colors.white} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Active toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Active</Text>
              <Text style={styles.toggleSubtext}>
                {isActive ? "Visible to customers" : "Hidden from customers"}
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{
                false: colors.border,
                true: colors.primary + "80",
              }}
              thumbColor={isActive ? colors.primary : colors.textMuted}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgMain,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    minWidth: 60,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // Form fields
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textBody,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    color: colors.textMain,
  },
  textArea: {
    minHeight: 80,
    paddingTop: spacing.sm + 2,
  },

  // Images
  imagesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  imageThumb: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    overflow: "hidden",
    position: "relative",
  },
  imageThumbImg: {
    width: 72,
    height: 72,
  },
  imageRemoveBtn: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: colors.white,
    borderRadius: 10,
  },
  addImageBtn: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary + "40",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },

  // Color picker
  colorRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  colorOptionSelected: {
    borderColor: colors.textMain,
  },

  // Active toggle
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textMain,
  },
  toggleSubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
});
