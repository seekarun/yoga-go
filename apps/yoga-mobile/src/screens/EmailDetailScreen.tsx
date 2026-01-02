import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../config/api";
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

function ReplyIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 17l-5-5 5-5M4 12h16"
        stroke={colors.white}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrashIcon({
  size = 24,
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
  to: EmailAddress[];
  cc?: EmailAddress[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  isOutgoing: boolean;
  threadMessages?: Email[];
}

type EmailDetailRouteProp = RouteProp<RootStackParamList, "EmailDetail">;

export default function EmailDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EmailDetailRouteProp>();
  const { emailId } = route.params;
  const { accessToken } = useAuth();
  const [email, setEmail] = useState<Email | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigateToReply = () => {
    if (!email) return;
    navigation.navigate("Reply", {
      emailId: email.id,
      toEmail: email.from.email,
      toName: email.from.name,
      subject: email.subject,
    });
  };

  const handleDelete = () => {
    Alert.alert("Delete Email", "Are you sure you want to delete this email?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: deleteEmail,
      },
    ]);
  };

  const deleteEmail = async () => {
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
        navigation.goBack();
      } else {
        Alert.alert("Error", data.error || "Failed to delete email");
      }
    } catch (err) {
      console.error("[DBG][EmailDetailScreen] Error deleting email:", err);
      Alert.alert("Error", "Failed to connect to server");
    }
  };

  const fetchEmail = useCallback(async () => {
    if (!accessToken) {
      setError("Not authenticated");
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch(
        `${API_BASE_URL}/data/app/expert/me/inbox/${emailId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const data = await response.json();

      if (data.success && data.data) {
        setEmail(data.data);
        // Mark as read if not already
        if (!data.data.isRead) {
          markAsRead();
        }
      } else {
        setError(data.error || "Failed to load email");
      }
    } catch (err) {
      console.error("[DBG][EmailDetailScreen] Error fetching email:", err);
      setError("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, emailId]);

  const markAsRead = async () => {
    if (!accessToken) return;

    try {
      await fetch(`${API_BASE_URL}/data/app/expert/me/inbox/${emailId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ isRead: true }),
      });
    } catch (err) {
      console.error("[DBG][EmailDetailScreen] Error marking as read:", err);
    }
  };

  useEffect(() => {
    fetchEmail();
  }, [fetchEmail]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAddress = (addr: EmailAddress) => {
    if (addr.name) {
      return `${addr.name} <${addr.email}>`;
    }
    return addr.email;
  };

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
          <Text style={styles.headerTitle}>Email</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading email...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !email) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Email</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || "Email not found"}</Text>
          <TouchableOpacity onPress={fetchEmail} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {email.subject || "(No subject)"}
        </Text>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <TrashIcon size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Header Section - Date, From, To */}
        <View style={styles.headerSection}>
          <View style={styles.dateRow}>
            <Text style={styles.date}>{formatDate(email.receivedAt)}</Text>
            <TouchableOpacity onPress={navigateToReply}>
              <Text style={styles.replyLink}>Reply</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.addressRow}>
            <Text style={styles.addressLabel}>From:</Text>
            <Text style={styles.addressValue}>{formatAddress(email.from)}</Text>
          </View>
          <View style={styles.addressRow}>
            <Text style={styles.addressLabel}>To:</Text>
            <Text style={styles.addressValue}>
              {email.to.map(formatAddress).join(", ")}
            </Text>
          </View>
          {email.cc && email.cc.length > 0 && (
            <View style={styles.addressRow}>
              <Text style={styles.addressLabel}>Cc:</Text>
              <Text style={styles.addressValue}>
                {email.cc.map(formatAddress).join(", ")}
              </Text>
            </View>
          )}
        </View>

        {/* Separator line - full width */}
        <View style={styles.separatorFull} />

        {/* Email Body */}
        <View style={styles.bodySection}>
          <Text style={styles.bodyText}>{email.bodyText}</Text>
        </View>

        {/* Reply Section - show outgoing replies in thread */}
        {email.threadMessages
          ?.filter((msg) => msg.isOutgoing && msg.id !== email.id)
          .map((reply) => (
            <View key={reply.id}>
              <View style={styles.replyHeaderSection}>
                <Text style={styles.replyHeader}>Your reply</Text>
              </View>
              <View style={styles.separatorFull} />
              <View style={styles.bodySection}>
                <Text style={styles.bodyText}>{reply.bodyText}</Text>
              </View>
            </View>
          ))}
      </ScrollView>

      {/* Floating Reply Button - show only if no replies */}
      {!email.threadMessages?.some(
        (msg) => msg.isOutgoing && msg.id !== email.id,
      ) && (
        <TouchableOpacity style={styles.fab} onPress={navigateToReply}>
          <ReplyIcon size={24} />
        </TouchableOpacity>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.white,
    marginLeft: spacing.sm,
  },
  headerSpacer: {
    width: 40,
  },
  deleteButton: {
    padding: spacing.sm,
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.bgMain,
  },
  headerSection: {
    backgroundColor: "#f5f5f5",
    padding: spacing.lg,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  replyLink: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  addressRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  addressLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    width: 50,
  },
  addressValue: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textBody,
  },
  separatorFull: {
    height: 1,
    backgroundColor: colors.border,
  },
  bodySection: {
    backgroundColor: colors.white,
    padding: spacing.lg,
  },
  bodyText: {
    fontSize: fontSize.md,
    color: colors.textBody,
    lineHeight: 24,
  },
  replyHeaderSection: {
    backgroundColor: "#f5f5f5",
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  replyHeader: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  fab: {
    position: "absolute",
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
