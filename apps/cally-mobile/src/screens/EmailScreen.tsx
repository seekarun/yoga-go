import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";
import { useNotificationContext } from "../contexts/NotificationContext";
import { fetchInbox, markEmailRead, toggleEmailStar } from "../services/email";
import type { Email } from "../services/email";
import type { RootStackParamList } from "../navigation/AppNavigator";
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
} from "../config/theme";

type Folder = "inbox" | "sent" | "trash" | "archive";

const FOLDERS: {
  key: Folder;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "inbox", label: "Inbox", icon: "mail-outline" },
  { key: "sent", label: "Sent", icon: "send-outline" },
  { key: "archive", label: "Archive", icon: "archive-outline" },
  { key: "trash", label: "Trash", icon: "trash-outline" },
];

function formatSender(email: Email): string {
  if (email.isOutgoing) {
    const toName = email.to[0]?.name || email.to[0]?.email || "Unknown";
    return `To: ${toName}`;
  }
  return email.from.name || email.from.email;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Yesterday";

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

function truncatePreview(text: string, maxLength = 80): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength) + "...";
}

export default function EmailScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { accessToken, refreshAccessToken } = useAuth();
  const { unreadEmailCount } = useNotificationContext();
  const [emails, setEmails] = useState<Email[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<Folder>("inbox");

  const loadEmails = useCallback(
    async (showLoader = true) => {
      if (!accessToken) return;

      if (showLoader) setIsLoading(true);
      setError(null);

      try {
        let response = await fetchInbox(accessToken, activeFolder);

        if (
          !response.success &&
          (response.error?.includes("expired") ||
            response.error?.includes("authenticated"))
        ) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            response = await fetchInbox(newToken, activeFolder);
          }
        }

        if (response.success && response.data) {
          setEmails(response.data.emails);
          setUnreadCount(response.data.unreadCount);
        } else {
          setError(response.error || "Failed to load emails");
        }
      } catch (err) {
        console.error("[DBG][EmailScreen] Error:", err);
        setError("Unable to load emails");
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, refreshAccessToken, activeFolder],
  );

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  // Auto-refresh when new email notifications arrive
  const prevUnreadEmailCountRef = useRef(0);
  useEffect(() => {
    if (
      unreadEmailCount > prevUnreadEmailCountRef.current &&
      prevUnreadEmailCountRef.current > 0
    ) {
      console.log(
        "[DBG][EmailScreen] New email notification detected, auto-refreshing",
      );
      loadEmails(false);
    }
    prevUnreadEmailCountRef.current = unreadEmailCount;
  }, [unreadEmailCount, loadEmails]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEmails(false);
  }, [loadEmails]);

  const handleToggleRead = useCallback(
    async (email: Email) => {
      if (!accessToken) return;
      const newIsRead = !email.isRead;

      // Optimistic update
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, isRead: newIsRead } : e)),
      );
      if (!email.isRead) setUnreadCount((c) => Math.max(0, c - 1));
      else setUnreadCount((c) => c + 1);

      try {
        await markEmailRead(email.id, newIsRead, accessToken);
      } catch (err) {
        console.error("[DBG][EmailScreen] Toggle read error:", err);
        // Revert on failure
        setEmails((prev) =>
          prev.map((e) =>
            e.id === email.id ? { ...e, isRead: !newIsRead } : e,
          ),
        );
      }
    },
    [accessToken],
  );

  const handleToggleStar = useCallback(
    async (email: Email) => {
      if (!accessToken) return;
      const newIsStarred = !email.isStarred;

      // Optimistic update
      setEmails((prev) =>
        prev.map((e) =>
          e.id === email.id ? { ...e, isStarred: newIsStarred } : e,
        ),
      );

      try {
        await toggleEmailStar(email.id, newIsStarred, accessToken);
      } catch (err) {
        console.error("[DBG][EmailScreen] Toggle star error:", err);
        setEmails((prev) =>
          prev.map((e) =>
            e.id === email.id ? { ...e, isStarred: !newIsStarred } : e,
          ),
        );
      }
    },
    [accessToken],
  );

  const handleEmailPress = useCallback(
    (email: Email) => {
      if (!email.isRead) {
        handleToggleRead(email);
      }
      navigation.navigate("EmailDetail", { email });
    },
    [handleToggleRead, navigation],
  );

  const renderEmailItem = useCallback(
    ({ item }: { item: Email }) => {
      const displayDate = item.threadLatestAt || item.receivedAt;
      const hasAttachments = item.attachments && item.attachments.length > 0;

      return (
        <TouchableOpacity
          style={[styles.emailRow, !item.isRead && styles.emailRowUnread]}
          onPress={() => handleEmailPress(item)}
          activeOpacity={0.7}
        >
          {/* Unread indicator */}
          <View style={styles.unreadDotContainer}>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>

          {/* Email content */}
          <View style={styles.emailContent}>
            <View style={styles.emailTopRow}>
              <Text
                style={[
                  styles.senderText,
                  !item.isRead && styles.senderTextUnread,
                ]}
                numberOfLines={1}
              >
                {formatSender(item)}
              </Text>
              <Text style={styles.dateText}>{formatDate(displayDate)}</Text>
            </View>

            <View style={styles.emailMiddleRow}>
              <Text
                style={[
                  styles.subjectText,
                  !item.isRead && styles.subjectTextUnread,
                ]}
                numberOfLines={1}
              >
                {item.subject || "(no subject)"}
              </Text>
              {item.threadCount && item.threadCount > 1 && (
                <View style={styles.threadBadge}>
                  <Text style={styles.threadBadgeText}>{item.threadCount}</Text>
                </View>
              )}
            </View>

            <View style={styles.emailBottomRow}>
              <Text style={styles.previewText} numberOfLines={1}>
                {truncatePreview(item.bodyText)}
              </Text>
              <View style={styles.emailIcons}>
                {hasAttachments && (
                  <Ionicons
                    name="attach"
                    size={14}
                    color={colors.textMuted}
                    style={styles.attachIcon}
                  />
                )}
                <TouchableOpacity
                  onPress={() => handleToggleStar(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={item.isStarred ? "star" : "star-outline"}
                    size={16}
                    color={item.isStarred ? colors.warning : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [handleEmailPress, handleToggleStar],
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name={
            activeFolder === "inbox"
              ? "mail-open-outline"
              : "folder-open-outline"
          }
          size={48}
          color={colors.border}
        />
        <Text style={styles.emptyTitle}>
          {activeFolder === "inbox" ? "No emails" : `No ${activeFolder} emails`}
        </Text>
        <Text style={styles.emptySubtext}>
          {activeFolder === "inbox"
            ? "Your inbox is empty"
            : `Nothing in ${activeFolder}`}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>
            {FOLDERS.find((f) => f.key === activeFolder)?.label || "Inbox"}
          </Text>
          {unreadCount > 0 && activeFolder === "inbox" && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Folder tabs */}
      <View style={styles.folderTabs}>
        {FOLDERS.map((folder) => (
          <TouchableOpacity
            key={folder.key}
            style={[
              styles.folderTab,
              activeFolder === folder.key && styles.folderTabActive,
            ]}
            onPress={() => setActiveFolder(folder.key)}
          >
            <Ionicons
              name={folder.icon}
              size={16}
              color={
                activeFolder === folder.key ? colors.primary : colors.textMuted
              }
            />
            <Text
              style={[
                styles.folderTabText,
                activeFolder === folder.key && styles.folderTabTextActive,
              ]}
            >
              {folder.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Email list */}
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
            onPress={() => loadEmails()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={emails}
          renderItem={renderEmailItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs + 2,
  },
  unreadBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  folderTabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  folderTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgMain,
  },
  folderTabActive: {
    backgroundColor: colors.primary + "15",
  },
  folderTabText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  folderTabTextActive: {
    color: colors.primary,
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
  emailRow: {
    flexDirection: "row",
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  emailRowUnread: {
    backgroundColor: colors.primary + "06",
  },
  unreadDotContainer: {
    width: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  emailContent: {
    flex: 1,
    gap: 3,
  },
  emailTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  senderText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textBody,
    marginRight: spacing.sm,
  },
  senderTextUnread: {
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  emailMiddleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  subjectText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textBody,
  },
  subjectTextUnread: {
    fontWeight: fontWeight.medium,
    color: colors.textMain,
  },
  threadBadge: {
    backgroundColor: colors.border,
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  threadBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  emailBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  emailIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  attachIcon: {
    transform: [{ rotate: "-45deg" }],
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 20,
  },
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
  },
});
