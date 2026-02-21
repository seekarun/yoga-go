import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
import { toggleEmailStar } from "../services/email";
import type { ComposeMode } from "../services/email";
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
} from "../config/theme";

type Props = NativeStackScreenProps<RootStackParamList, "EmailDetail">;

// --- Helpers ---

function formatFullDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(isoString: string): string {
  return `${formatFullDate(isoString)} at ${formatTime(isoString)}`;
}

function formatAddress(addr: { name?: string; email: string }): string {
  if (addr.name) return `${addr.name} <${addr.email}>`;
  return addr.email;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentIcon(mimeType: string): keyof typeof Ionicons.glyphMap {
  if (mimeType.startsWith("image/")) return "image-outline";
  if (mimeType.startsWith("video/")) return "videocam-outline";
  if (mimeType.includes("pdf")) return "document-text-outline";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "grid-outline";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "easel-outline";
  return "document-outline";
}

// --- Component ---

export default function EmailDetailScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const { accessToken } = useAuth();
  const [isStarred, setIsStarred] = React.useState(email.isStarred);

  const handleToggleStar = useCallback(async () => {
    if (!accessToken) return;
    const newVal = !isStarred;
    setIsStarred(newVal);
    try {
      await toggleEmailStar(email.id, newVal, accessToken);
    } catch {
      setIsStarred(!newVal);
    }
  }, [accessToken, email.id, isStarred]);

  const handleCompose = useCallback(
    (mode: ComposeMode) => {
      navigation.navigate("Compose", { mode, email });
    },
    [navigation, email],
  );

  const hasAttachments = email.attachments && email.attachments.length > 0;
  const hasCc = email.cc && email.cc.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textMain} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleToggleStar}
            style={styles.headerButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isStarred ? "star" : "star-outline"}
              size={22}
              color={isStarred ? colors.warning : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Subject */}
        <Text style={styles.subject}>{email.subject || "(no subject)"}</Text>

        {/* Sender card */}
        <View style={styles.senderCard}>
          <View style={styles.senderAvatar}>
            <Text style={styles.senderInitial}>
              {(email.from.name || email.from.email)[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.senderInfo}>
            <View style={styles.senderNameRow}>
              <Text style={styles.senderName} numberOfLines={1}>
                {email.from.name || email.from.email}
              </Text>
              <Text style={styles.dateLabel}>
                {formatTime(email.receivedAt)}
              </Text>
            </View>
            <Text style={styles.senderEmail} numberOfLines={1}>
              {email.from.email}
            </Text>
            <View style={styles.recipientsRow}>
              <Text style={styles.recipientLabel}>To: </Text>
              <Text style={styles.recipientValue} numberOfLines={1}>
                {email.to.map(formatAddress).join(", ")}
              </Text>
            </View>
            {hasCc && (
              <View style={styles.recipientsRow}>
                <Text style={styles.recipientLabel}>Cc: </Text>
                <Text style={styles.recipientValue} numberOfLines={1}>
                  {email.cc!.map(formatAddress).join(", ")}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Date */}
        <Text style={styles.fullDate}>{formatDateTime(email.receivedAt)}</Text>

        {/* Attachments */}
        {hasAttachments && (
          <View style={styles.attachmentsSection}>
            <View style={styles.attachmentsHeader}>
              <Ionicons name="attach" size={16} color={colors.textMuted} />
              <Text style={styles.attachmentsTitle}>
                {email.attachments.length} attachment
                {email.attachments.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <View style={styles.attachmentsList}>
              {email.attachments.map((att) => (
                <View key={att.id} style={styles.attachmentChip}>
                  <Ionicons
                    name={getAttachmentIcon(att.mimeType)}
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {att.filename}
                  </Text>
                  <Text style={styles.attachmentSize}>
                    {formatFileSize(att.size)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Body */}
        <Text style={styles.bodyText}>{email.bodyText}</Text>
      </ScrollView>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleCompose("reply")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-undo-outline"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.actionButtonText}>Reply</Text>
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleCompose("reply-all")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-undo-outline"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.actionButtonText}>Reply All</Text>
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleCompose("forward")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-redo-outline"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.actionButtonText}>Forward</Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // --- Subject ---
  subject: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textMain,
    lineHeight: 30,
    marginBottom: spacing.md,
  },

  // --- Sender card ---
  senderCard: {
    flexDirection: "row",
    gap: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  senderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  senderInitial: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  senderInfo: {
    flex: 1,
  },
  senderNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  senderName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
    marginRight: spacing.sm,
  },
  dateLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  senderEmail: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  recipientsRow: {
    flexDirection: "row",
    marginTop: 3,
  },
  recipientLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  recipientValue: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textBody,
  },

  // --- Date ---
  fullDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },

  // --- Attachments ---
  attachmentsSection: {
    marginBottom: spacing.md,
  },
  attachmentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  attachmentsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  attachmentsList: {
    gap: spacing.sm,
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachmentName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textMain,
  },
  attachmentSize: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  // --- Divider ---
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },

  // --- Body ---
  bodyText: {
    fontSize: fontSize.md,
    color: colors.textBody,
    lineHeight: 24,
  },

  // --- Action bar ---
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  actionDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
});
