import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchPreferences,
  updateTimezone,
  SUPPORTED_TIMEZONES,
} from "../services/settings";
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
} from "../config/theme";

function getTimezoneLabel(tz: string): string {
  try {
    const short = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    return short ? `${tz} (${short})` : tz;
  } catch {
    return tz;
  }
}

export default function SettingsScreen() {
  const { accessToken, refreshAccessToken, signOut, user } = useAuth();

  const [timezone, setTimezone] = useState<string>("Australia/Sydney");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTimezoneList, setShowTimezoneList] = useState(false);

  const loadPreferences = useCallback(
    async (showLoader = true) => {
      if (!accessToken) return;
      if (showLoader) setIsLoading(true);

      try {
        let response = await fetchPreferences(accessToken);

        if (
          !response.success &&
          (response.error?.includes("expired") ||
            response.error?.includes("authenticated"))
        ) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            response = await fetchPreferences(newToken);
          }
        }

        if (response.success && response.data) {
          setTimezone(response.data.timezone);
        }
      } catch (err) {
        console.error("[DBG][SettingsScreen] Error loading preferences:", err);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, refreshAccessToken],
  );

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPreferences(false);
  }, [loadPreferences]);

  const handleSelectTimezone = useCallback(
    async (tz: string) => {
      if (!accessToken || tz === timezone) {
        setShowTimezoneList(false);
        return;
      }

      setIsSaving(true);
      const previousTz = timezone;
      setTimezone(tz);
      setShowTimezoneList(false);

      try {
        let response = await updateTimezone(tz, accessToken);

        if (
          !response.success &&
          (response.error?.includes("expired") ||
            response.error?.includes("authenticated"))
        ) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            response = await updateTimezone(tz, newToken);
          }
        }

        if (!response.success) {
          setTimezone(previousTz);
          Alert.alert("Error", response.error || "Failed to update timezone");
        }
      } catch (err) {
        console.error("[DBG][SettingsScreen] Error updating timezone:", err);
        setTimezone(previousTz);
        Alert.alert("Error", "Something went wrong. Please try again.");
      } finally {
        setIsSaving(false);
      }
    },
    [accessToken, refreshAccessToken, timezone],
  );

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  }, [signOut]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
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
          {/* Account section */}
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.card}>
            {/* Email (read-only) */}
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.textMuted}
                />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Email</Text>
                <Text style={styles.settingValue}>{user?.email || "—"}</Text>
              </View>
            </View>

            <View style={styles.settingDivider} />

            {/* Timezone */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowTimezoneList(!showTimezoneList)}
              activeOpacity={0.7}
            >
              <View style={styles.settingIcon}>
                <Ionicons
                  name="globe-outline"
                  size={20}
                  color={colors.textMuted}
                />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Timezone</Text>
                <View style={styles.settingValueRow}>
                  <Text style={styles.settingValue}>
                    {isSaving ? "Saving..." : getTimezoneLabel(timezone)}
                  </Text>
                  <Ionicons
                    name={showTimezoneList ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.textMuted}
                  />
                </View>
              </View>
            </TouchableOpacity>

            {/* Timezone list */}
            {showTimezoneList && (
              <View style={styles.timezoneList}>
                {SUPPORTED_TIMEZONES.map((tz) => {
                  const isSelected = tz === timezone;
                  return (
                    <TouchableOpacity
                      key={tz}
                      style={[
                        styles.timezoneItem,
                        isSelected && styles.timezoneItemSelected,
                      ]}
                      onPress={() => handleSelectTimezone(tz)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.timezoneText,
                          isSelected && styles.timezoneTextSelected,
                        ]}
                      >
                        {getTimezoneLabel(tz)}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Sign out */}
          <Text style={styles.sectionLabel}>DANGER ZONE</Text>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
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
  },

  // --- Section ---
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    marginLeft: spacing.xs,
  },

  // --- Card ---
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },

  // --- Setting row ---
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  settingIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: fontSize.md,
    color: colors.textMain,
  },
  settingValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 32 + spacing.sm,
  },

  // --- Timezone list ---
  timezoneList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgMain,
  },
  timezoneItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timezoneItemSelected: {
    backgroundColor: colors.primary + "08",
  },
  timezoneText: {
    fontSize: fontSize.sm,
    color: colors.textBody,
  },
  timezoneTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },

  // --- Sign out ---
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  signOutText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.error,
  },
});
