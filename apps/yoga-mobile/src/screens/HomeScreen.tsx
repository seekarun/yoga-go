import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

const DRAWER_WIDTH = Math.min(Dimensions.get("window").width * 0.75, 300);
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
import { getDashboardStats, type DashboardStats } from "../services/expert";
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
} from "../config/theme";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function MenuIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M3 12h18M3 18h18"
        stroke={colors.white}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
}

function StatCard({
  title,
  value,
  subtitle,
  color = colors.primary,
}: StatCardProps) {
  return (
    <View style={styles.statCardWrapper}>
      <View style={styles.statCard}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

function formatCurrency(amount: number, currency: string): string {
  // Amount is in cents
  const value = amount / 100;
  if (currency === "INR") {
    return `Rs ${value.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
  }
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, accessToken, signOut } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const openDrawer = () => {
    setShowMenu(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowMenu(false);
      if (callback) callback();
    });
  };

  const handleMenuPress = (screen: "Inbox" | "Survey" | "Blog") => {
    closeDrawer(() => navigation.navigate(screen));
  };

  const handleSignOut = () => {
    closeDrawer(() => signOut());
  };

  const fetchStats = useCallback(async () => {
    if (!accessToken) {
      setError("Not authenticated");
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await getDashboardStats(accessToken);

      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || "Failed to load stats");
      }
    } catch (err) {
      console.error("[DBG][HomeScreen] Error fetching stats:", err);
      setError("Failed to connect to server");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchStats();
  }, [fetchStats]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Menu */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
          <MenuIcon size={24} />
        </TouchableOpacity>
        <Text style={styles.greeting}>
          Namaste, {user?.name || user?.email}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Slide-in Drawer Menu */}
      <Modal
        visible={showMenu}
        transparent
        animationType="none"
        onRequestClose={() => closeDrawer()}
      >
        <View style={styles.drawerContainer}>
          <Animated.View style={[styles.drawerOverlay, { opacity: fadeAnim }]}>
            <Pressable
              style={styles.drawerOverlayPress}
              onPress={() => closeDrawer()}
            />
          </Animated.View>
          <Animated.View
            style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
          >
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Menu</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => closeDrawer()}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.drawerContent}>
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => handleMenuPress("Inbox")}
              >
                <Text style={styles.drawerItemText}>Inbox</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => handleMenuPress("Blog")}
              >
                <Text style={styles.drawerItemText}>Blog</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => handleMenuPress("Survey")}
              >
                <Text style={styles.drawerItemText}>Survey</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.drawerFooter}>
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={handleSignOut}
              >
                <Text style={styles.drawerItemTextDanger}>Logout</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Error Message */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchStats} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsGrid}>
            <StatCard
              title="Wallet Balance"
              value={formatCurrency(stats.walletBalance, stats.currency)}
              subtitle="Available balance"
              color={colors.highlight}
            />
            <StatCard
              title="Total Students"
              value={stats.totalStudents.toString()}
              subtitle="Enrolled learners"
              color={colors.primary}
            />
            <StatCard
              title="Total Courses"
              value={stats.totalCourses.toString()}
              subtitle="Published courses"
              color={colors.secondary}
            />
            <StatCard
              title="Rating"
              value={stats.rating > 0 ? stats.rating.toFixed(1) : "N/A"}
              subtitle="Average rating"
              color={colors.textBody}
            />
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
  },
  menuButton: {
    padding: spacing.sm,
  },
  greeting: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.white,
    marginLeft: spacing.sm,
  },
  headerSpacer: {
    width: 40,
  },
  drawerContainer: {
    flex: 1,
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  drawerOverlayPress: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  drawerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  drawerContent: {
    flex: 1,
    paddingTop: spacing.md,
  },
  drawerItem: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  drawerItemText: {
    fontSize: fontSize.lg,
    color: colors.textBody,
    fontWeight: fontWeight.medium,
  },
  drawerItemTextDanger: {
    fontSize: fontSize.lg,
    color: colors.error,
    fontWeight: fontWeight.medium,
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing.xxl,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  errorBox: {
    backgroundColor: colors.errorBg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  retryText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.sm,
  },
  statCardWrapper: {
    width: "50%",
    padding: spacing.sm,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  statSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
