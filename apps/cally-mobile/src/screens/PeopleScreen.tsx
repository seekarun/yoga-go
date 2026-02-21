import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
import { fetchUsers } from "../services/people";
import type { CallyUser, UserType } from "../services/people";
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
} from "../config/theme";

type FilterKey = "all" | UserType;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "registered", label: "Registered" },
  { key: "visitor", label: "Visitors" },
  { key: "contact", label: "Contacts" },
];

const TYPE_COLORS: Record<UserType, { bg: string; text: string }> = {
  registered: { bg: "#ecfdf5", text: "#047857" },
  visitor: { bg: "#fffbeb", text: "#b45309" },
  contact: { bg: "#eff6ff", text: "#1d4ed8" },
};

function formatLocation(user: CallyUser): string | null {
  if (!user.visitorInfo) return null;
  const parts = [user.visitorInfo.city, user.visitorInfo.country].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

function formatDate(isoString?: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getUserDate(user: CallyUser): string {
  if (user.subscribedAt) return formatDate(user.subscribedAt);
  if (user.lastBookingDate) return formatDate(user.lastBookingDate);
  if (user.lastContactDate) return formatDate(user.lastContactDate);
  return "";
}

export default function PeopleScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { accessToken, refreshAccessToken } = useAuth();
  const [users, setUsers] = useState<CallyUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const loadUsers = useCallback(
    async (showLoader = true) => {
      if (!accessToken) return;
      if (showLoader) setIsLoading(true);
      setError(null);

      try {
        let response = await fetchUsers(accessToken);

        if (
          !response.success &&
          (response.error?.includes("expired") ||
            response.error?.includes("authenticated"))
        ) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            response = await fetchUsers(newToken);
          }
        }

        if (response.success && response.data) {
          setUsers(response.data);
        } else {
          setError(response.error || "Failed to load users");
        }
      } catch (err) {
        console.error("[DBG][PeopleScreen] Error:", err);
        setError("Unable to load users");
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, refreshAccessToken],
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUsers(false);
  }, [loadUsers]);

  // Filter + search
  const filteredUsers = useMemo(() => {
    let result = users.filter((u) => !u.anonymous);

    if (activeFilter !== "all") {
      result = result.filter((u) => u.userType === activeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      );
    }

    return result;
  }, [users, activeFilter, search]);

  // Counts for filter pills
  const counts = useMemo(() => {
    const nonAnon = users.filter((u) => !u.anonymous);
    return {
      all: nonAnon.length,
      registered: nonAnon.filter((u) => u.userType === "registered").length,
      visitor: nonAnon.filter((u) => u.userType === "visitor").length,
      contact: nonAnon.filter((u) => u.userType === "contact").length,
    };
  }, [users]);

  const handleUserPress = useCallback(
    (user: CallyUser) => {
      navigation.navigate("UserDetail", {
        userEmail: user.email,
        userName: user.name,
      });
    },
    [navigation],
  );

  const renderUserItem = useCallback(
    ({ item }: { item: CallyUser }) => {
      const location = formatLocation(item);
      const dateStr = getUserDate(item);
      const typeColor = TYPE_COLORS[item.userType];

      return (
        <TouchableOpacity
          style={styles.userCard}
          onPress={() => handleUserPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.userRow}>
            {/* Avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.name || item.email)[0].toUpperCase()}
              </Text>
            </View>

            {/* Info */}
            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName} numberOfLines={1}>
                  {item.name || item.email}
                </Text>
                <View
                  style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}
                >
                  <Text
                    style={[styles.typeBadgeText, { color: typeColor.text }]}
                  >
                    {item.userType === "registered"
                      ? "Registered"
                      : item.userType === "visitor"
                        ? "Visitor"
                        : "Contact"}
                  </Text>
                </View>
              </View>

              <Text style={styles.userEmail} numberOfLines={1}>
                {item.email}
              </Text>

              <View style={styles.metaRow}>
                {location && (
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="location-outline"
                      size={12}
                      color={colors.textMuted}
                    />
                    <Text style={styles.metaText}>{location}</Text>
                  </View>
                )}
                {item.totalBookings != null && item.totalBookings > 0 && (
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={12}
                      color={colors.textMuted}
                    />
                    <Text style={styles.metaText}>
                      {item.totalBookings} booking
                      {item.totalBookings !== 1 ? "s" : ""}
                    </Text>
                  </View>
                )}
                {dateStr !== "" && (
                  <Text style={styles.metaDate}>{dateStr}</Text>
                )}
              </View>
            </View>

            {/* Chevron */}
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.border}
              style={styles.chevron}
            />
          </View>
        </TouchableOpacity>
      );
    },
    [handleUserPress],
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={48} color={colors.border} />
        <Text style={styles.emptyTitle}>No users found</Text>
        <Text style={styles.emptySubtext}>
          {search.trim()
            ? "Try a different search term"
            : "Users will appear here as they interact with you"}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>People</Text>
        <Text style={styles.headerCount}>{counts.all}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          const count = counts[f.key];
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  isActive && styles.filterPillTextActive,
                ]}
              >
                {f.label}
              </Text>
              <Text
                style={[
                  styles.filterCount,
                  isActive && styles.filterCountActive,
                ]}
              >
                {count}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* User list */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => loadUsers()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.email}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
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
    gap: spacing.sm,
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
  headerCount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    backgroundColor: colors.bgMain,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
  },

  // --- Search ---
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.bgMain,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textMain,
    paddingVertical: 0,
  },

  // --- Filter pills ---
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgMain,
  },
  filterPillActive: {
    backgroundColor: colors.primary + "15",
  },
  filterPillText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  filterPillTextActive: {
    color: colors.primary,
  },
  filterCount: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  filterCountActive: {
    color: colors.primary,
  },

  // --- List ---
  listContent: {
    paddingVertical: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: "center",
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
  retryText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },

  // --- User card ---
  userCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm + 2,
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 1,
  },
  userName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
  },
  typeBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
  },
  userEmail: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  metaDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  chevron: {
    marginLeft: spacing.xs,
  },

  // --- Empty state ---
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxl * 2,
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
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
});
