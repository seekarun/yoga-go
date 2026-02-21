import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchProducts,
  deleteProduct as deleteProductApi,
} from "../services/products";
import type { Product } from "../services/products";
import type { RootStackParamList } from "../navigation/AppNavigator";
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
} from "../config/theme";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getProductImageUrl(product: Product): string | undefined {
  if (product.images && product.images.length > 0) {
    return product.images[0].url;
  }
  return product.image || undefined;
}

export default function ProductsScreen() {
  const navigation = useNavigation<Nav>();
  const { accessToken, refreshAccessToken } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = useCallback(
    async (showLoader = true) => {
      if (!accessToken) return;
      if (showLoader) setIsLoading(true);

      try {
        let response = await fetchProducts(accessToken);

        if (
          !response.success &&
          (response.error?.includes("expired") ||
            response.error?.includes("authenticated"))
        ) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            response = await fetchProducts(newToken);
          }
        }

        if (response.success && response.data) {
          const sorted = [...response.data].sort(
            (a, b) => a.sortOrder - b.sortOrder,
          );
          setProducts(sorted);
        }
      } catch (err) {
        console.error("[DBG][ProductsScreen] Error loading products:", err);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, refreshAccessToken],
  );

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Reload when screen comes back into focus (after create/edit)
  useFocusEffect(
    useCallback(() => {
      loadProducts(false);
    }, [loadProducts]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProducts(false);
  }, [loadProducts]);

  const handleDelete = useCallback(
    (product: Product) => {
      Alert.alert(
        "Delete Product",
        `Are you sure you want to delete "${product.name}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              if (!accessToken) return;
              try {
                let response = await deleteProductApi(product.id, accessToken);
                if (
                  !response.success &&
                  (response.error?.includes("expired") ||
                    response.error?.includes("authenticated"))
                ) {
                  const newToken = await refreshAccessToken();
                  if (newToken) {
                    response = await deleteProductApi(product.id, newToken);
                  }
                }
                if (response.success) {
                  setProducts((prev) =>
                    prev.filter((p) => p.id !== product.id),
                  );
                } else {
                  Alert.alert(
                    "Error",
                    response.error || "Failed to delete product",
                  );
                }
              } catch (err) {
                console.error(
                  "[DBG][ProductsScreen] Error deleting product:",
                  err,
                );
                Alert.alert("Error", "Something went wrong. Please try again.");
              }
            },
          },
        ],
      );
    },
    [accessToken, refreshAccessToken],
  );

  const renderProduct = (product: Product) => {
    const imageUrl = getProductImageUrl(product);

    return (
      <TouchableOpacity
        key={product.id}
        style={styles.card}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate("ProductForm", {
            mode: "edit",
            product,
          })
        }
      >
        {/* Image or color swatch */}
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImage} />
        ) : (
          <View
            style={[
              styles.cardImagePlaceholder,
              { backgroundColor: product.color || colors.border },
            ]}
          >
            <Ionicons name="cube-outline" size={24} color={colors.white} />
          </View>
        )}

        {/* Info */}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardName} numberOfLines={1}>
              {product.name}
            </Text>
            {!product.isActive && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactive</Text>
              </View>
            )}
          </View>

          {product.description ? (
            <Text style={styles.cardDescription} numberOfLines={1}>
              {product.description}
            </Text>
          ) : null}

          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons
                name="time-outline"
                size={14}
                color={colors.textMuted}
              />
              <Text style={styles.metaText}>
                {formatDuration(product.durationMinutes)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.cardPrice}>{formatPrice(product.price)}</Text>
            </View>
            {product.color && (
              <View
                style={[styles.colorDot, { backgroundColor: product.color }]}
              />
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              navigation.navigate("ProductForm", {
                mode: "edit",
                product,
              })
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDelete(product)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Products</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("ProductForm", { mode: "create" })}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : products.length === 0 ? (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <Ionicons name="cube-outline" size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>No products yet</Text>
          <Text style={styles.emptySubtext}>
            Tap + to add your first product
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {products.map(renderProduct)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgMain,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  cardImage: {
    width: 72,
    height: 72,
    backgroundColor: colors.bgMain,
  },
  cardImagePlaceholder: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  cardName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
    flex: 1,
  },
  inactiveBadge: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  inactiveBadgeText: {
    fontSize: fontSize.xs - 1,
    fontWeight: fontWeight.medium,
    color: colors.warning,
  },
  cardDescription: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  cardPrice: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardActions: {
    paddingRight: spacing.sm,
    gap: spacing.sm,
  },
  actionBtn: {
    padding: spacing.xs,
  },
});
