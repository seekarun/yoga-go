import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import {
  Swipeable,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../config/api";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
} from "../config/theme";

function BackIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={colors.white}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashIcon({
  size = 20,
  color = colors.white,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface EmailAddress {
  name?: string;
  email: string;
}

interface Email {
  id: string;
  from: EmailAddress;
  subject: string;
  bodyText: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  threadCount?: number;
  threadHasUnread?: boolean;
}

interface EmailListResult {
  emails: Email[];
  totalCount: number;
  unreadCount: number;
}

export default function InboxScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { accessToken } = useAuth();
  const [emails, setEmails] = useState<Email[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    if (!accessToken) {
      setError("Not authenticated");
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch(
        `${API_BASE_URL}/data/app/expert/me/inbox?limit=50`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const data = await response.json();

      if (data.success && data.data) {
        const result = data.data as EmailListResult;
        setEmails(result.emails || []);
        setUnreadCount(result.unreadCount || 0);
      } else {
        setError(data.error || "Failed to load emails");
      }
    } catch (err) {
      console.error("[DBG][InboxScreen] Error fetching emails:", err);
      setError("Failed to connect to server");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchEmails();
  }, [fetchEmails]);

  const handleDelete = (emailId: string, subject: string) => {
    Alert.alert("Delete Email", `Delete "${subject || "(No subject)"}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteEmail(emailId),
      },
    ]);
  };

  const deleteEmail = async (emailId: string) => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/data/app/expert/me/inbox/${emailId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        // Remove from local state
        setEmails((prev) => prev.filter((e) => e.id !== emailId));
        setUnreadCount((prev) => {
          const deletedEmail = emails.find((e) => e.id === emailId);
          return deletedEmail && !deletedEmail.isRead ? prev - 1 : prev;
        });
      } else {
        Alert.alert("Error", data.error || "Failed to delete email");
      }
    } catch (err) {
      console.error("[DBG][InboxScreen] Error deleting email:", err);
      Alert.alert("Error", "Failed to connect to server");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getSenderName = (from: EmailAddress) => {
    if (from.name) return from.name;
    return from.email.split("@")[0];
  };

  const getPreviewText = (body: string) => {
    const cleaned = body.replace(/\s+/g, " ").trim();
    return cleaned.length > 80 ? cleaned.substring(0, 80) + "..." : cleaned;
  };

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    emailId: string,
    subject: string,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0.5],
      extrapolate: "clamp",
    });

    return (
      <TouchableOpacity
        style={styles.swipeDeleteButton}
        onPress={() => {
          swipeableRefs.current.get(emailId)?.close();
          handleDelete(emailId, subject);
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <TrashIcon size={24} />
        </Animated.View>
        <Text style={styles.swipeDeleteText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const renderEmailItem = ({ item }: { item: Email }) => (
    <Swipeable
      ref={(ref) => {
        if (ref) swipeableRefs.current.set(item.id, ref);
      }}
      renderRightActions={(progress, dragX) =>
        renderRightActions(progress, dragX, item.id, item.subject)
      }
      overshootRight={false}
    >
      <TouchableOpacity
        style={[styles.emailItem, !item.isRead && styles.emailItemUnread]}
        onPress={() => navigation.navigate("EmailDetail", { emailId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.emailHeader}>
          <Text
            style={[styles.senderName, !item.isRead && styles.senderNameUnread]}
            numberOfLines={1}
          >
            {getSenderName(item.from)}
          </Text>
          <Text style={styles.emailDate}>{formatDate(item.receivedAt)}</Text>
        </View>
        <Text
          style={[
            styles.emailSubject,
            !item.isRead && styles.emailSubjectUnread,
          ]}
          numberOfLines={1}
        >
          {item.subject || "(No subject)"}
          {item.threadCount && item.threadCount > 1 && (
            <Text style={styles.threadCount}> ({item.threadCount})</Text>
          )}
        </Text>
        <Text style={styles.emailPreview} numberOfLines={1}>
          {getPreviewText(item.bodyText)}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inbox</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading emails...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Inbox {unreadCount > 0 && `(${unreadCount})`}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchEmails} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={emails}
          keyExtractor={(item) => item.id}
          renderItem={renderEmailItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={
            emails.length === 0 ? styles.emptyContainer : undefined
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No emails yet</Text>
              <Text style={styles.emptySubtext}>
                Emails sent to your expert address will appear here
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
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
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.white,
    marginLeft: spacing.sm,
  },
  headerSpacer: {
    width: 40,
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
    margin: spacing.md,
    borderRadius: borderRadius.md,
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
  emailItem: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  emailItemUnread: {
    backgroundColor: colors.bgMain,
  },
  swipeDeleteButton: {
    backgroundColor: colors.error,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
  },
  swipeDeleteText: {
    color: colors.white,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  emailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  senderName: {
    fontSize: fontSize.md,
    color: colors.textBody,
    flex: 1,
  },
  senderNameUnread: {
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
  },
  emailDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  emailSubject: {
    fontSize: fontSize.sm,
    color: colors.textBody,
    marginBottom: spacing.xs,
  },
  emailSubjectUnread: {
    fontWeight: fontWeight.medium,
    color: colors.textMain,
  },
  threadCount: {
    color: colors.textMuted,
    fontWeight: fontWeight.normal,
  },
  emailPreview: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.textBody,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: "center",
  },
});
