import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
import { replyToEmail, sendNewEmail } from "../services/email";
import type { EmailAddress, ComposeMode } from "../services/email";
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
} from "../config/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Compose">;

function formatAddress(addr: EmailAddress): string {
  if (addr.name) return `${addr.name} <${addr.email}>`;
  return addr.email;
}

function getModeLabel(mode: ComposeMode): string {
  switch (mode) {
    case "compose":
      return "New Email";
    case "reply":
      return "Reply";
    case "reply-all":
      return "Reply All";
    case "forward":
      return "Forward";
  }
}

function getModeIcon(mode: ComposeMode): keyof typeof Ionicons.glyphMap {
  switch (mode) {
    case "compose":
      return "create-outline";
    case "reply":
      return "arrow-undo-outline";
    case "reply-all":
      return "arrow-undo-outline";
    case "forward":
      return "arrow-redo-outline";
  }
}

export default function ComposeScreen({ navigation, route }: Props) {
  const { mode, email } = route.params;
  const { accessToken, refreshAccessToken } = useAuth();
  const isNewCompose = mode === "compose";

  // Pre-fill recipients based on mode
  const initialTo = useMemo((): EmailAddress[] => {
    if (!email) return [];
    switch (mode) {
      case "compose":
        return [];
      case "reply":
        return [email.from];
      case "reply-all":
        return [email.from];
      case "forward":
        return [];
    }
  }, [mode, email]);

  const initialCc = useMemo((): EmailAddress[] => {
    if (!email || mode !== "reply-all") return [];
    const all = [...(email.to || []), ...(email.cc || [])];
    return all;
  }, [mode, email]);

  const initialSubject = useMemo((): string => {
    if (!email) return "";
    const sub = email.subject || "";
    if (mode === "forward") {
      return sub.startsWith("Fwd: ") ? sub : `Fwd: ${sub}`;
    }
    if (mode === "compose") return "";
    return sub.startsWith("Re: ") ? sub : `Re: ${sub}`;
  }, [mode, email]);

  const initialBody = useMemo((): string => {
    if (!email || mode !== "forward") return "";
    const header = `\n\n---------- Forwarded message ----------\nFrom: ${email.from.name || ""} <${email.from.email}>\nDate: ${new Date(email.receivedAt).toLocaleString()}\nSubject: ${email.subject}\nTo: ${email.to.map((t) => t.email).join(", ")}\n\n`;
    return header + email.bodyText;
  }, [mode, email]);

  const [toField, setToField] = useState(
    initialTo.map(formatAddress).join(", "),
  );
  const [ccField, setCcField] = useState(
    initialCc.map(formatAddress).join(", "),
  );
  const [bccField, setBccField] = useState("");
  const [showCc, setShowCc] = useState(initialCc.length > 0);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(mode === "forward" ? initialBody : "");
  const [isSending, setIsSending] = useState(false);

  // Parse email addresses from comma-separated string
  const parseAddresses = useCallback((text: string): EmailAddress[] => {
    return text
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => {
        const match = s.match(/^(.+?)\s*<(.+?)>$/);
        if (match) {
          return { name: match[1].trim(), email: match[2].trim() };
        }
        return { email: s };
      });
  }, []);

  const handleSend = useCallback(async () => {
    if (!accessToken) return;

    const toAddresses = parseAddresses(toField);
    const ccAddresses = showCc ? parseAddresses(ccField) : undefined;
    const bccAddresses = showBcc ? parseAddresses(bccField) : undefined;

    // Validate recipients
    if ((isNewCompose || mode === "forward") && toAddresses.length === 0) {
      Alert.alert("Missing recipient", "Please add at least one recipient.");
      return;
    }

    const messageText = mode === "forward" ? body : body.trim();

    // Validate content
    if (isNewCompose) {
      if (messageText.length === 0 && !subject.trim()) {
        Alert.alert(
          "Empty email",
          "Please add a subject or message before sending.",
        );
        return;
      }
    } else if (mode !== "forward" && messageText.length === 0) {
      Alert.alert("Empty message", "Please write a message before sending.");
      return;
    }

    setIsSending(true);

    try {
      if (isNewCompose) {
        // Send new email via compose endpoint
        let response = await sendNewEmail(
          {
            to: toAddresses,
            cc: ccAddresses,
            bcc: bccAddresses,
            subject: subject.trim(),
            text: messageText,
          },
          accessToken,
        );

        // Handle token expiry
        if (
          !response.success &&
          (response.error?.includes("expired") ||
            response.error?.includes("authenticated"))
        ) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            response = await sendNewEmail(
              {
                to: toAddresses,
                cc: ccAddresses,
                bcc: bccAddresses,
                subject: subject.trim(),
                text: messageText,
              },
              newToken,
            );
          }
        }

        if (response.success) {
          Alert.alert("Sent", "Email sent successfully.", [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
        } else {
          Alert.alert("Error", response.error || "Failed to send.");
        }
      } else {
        // Reply / Reply-all / Forward via existing endpoint
        let response = await replyToEmail(
          email!.id,
          {
            text: messageText,
            mode,
            to:
              mode === "forward" || mode === "reply-all"
                ? toAddresses
                : undefined,
            cc: ccAddresses,
          },
          accessToken,
        );

        // Handle token expiry
        if (
          !response.success &&
          (response.error?.includes("expired") ||
            response.error?.includes("authenticated"))
        ) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            response = await replyToEmail(
              email!.id,
              {
                text: messageText,
                mode,
                to:
                  mode === "forward" || mode === "reply-all"
                    ? toAddresses
                    : undefined,
                cc: ccAddresses,
              },
              newToken,
            );
          }
        }

        if (response.success) {
          Alert.alert("Sent", `${getModeLabel(mode)} sent successfully.`, [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
        } else {
          Alert.alert("Error", response.error || "Failed to send.");
        }
      }
    } catch (err) {
      console.error("[DBG][ComposeScreen] Send error:", err);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  }, [
    accessToken,
    refreshAccessToken,
    body,
    bccField,
    ccField,
    email,
    isNewCompose,
    mode,
    navigation,
    parseAddresses,
    showBcc,
    showCc,
    subject,
    toField,
  ]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={24} color={colors.textMain} />
        </TouchableOpacity>

        <View style={styles.headerTitleRow}>
          <Ionicons
            name={getModeIcon(mode)}
            size={18}
            color={colors.textMain}
          />
          <Text style={styles.headerTitle}>{getModeLabel(mode)}</Text>
        </View>

        <TouchableOpacity
          onPress={handleSend}
          style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
          disabled={isSending}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Ionicons name="send" size={16} color={colors.white} />
              <Text style={styles.sendButtonText}>Send</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollInner}
          keyboardShouldPersistTaps="handled"
        >
          {/* To field */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>To</Text>
            <TextInput
              style={styles.fieldInput}
              value={toField}
              onChangeText={setToField}
              placeholder="Recipients"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={
                isNewCompose || mode === "forward" || mode === "reply-all"
              }
              autoFocus={isNewCompose}
            />
            <View style={styles.ccBccToggles}>
              {!showCc && (
                <TouchableOpacity onPress={() => setShowCc(true)}>
                  <Text style={styles.ccToggle}>Cc</Text>
                </TouchableOpacity>
              )}
              {!showBcc && (
                <TouchableOpacity onPress={() => setShowBcc(true)}>
                  <Text style={styles.ccToggle}>Bcc</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.fieldDivider} />

          {/* Cc field */}
          {showCc && (
            <>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Cc</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={ccField}
                  onChangeText={setCcField}
                  placeholder="Cc recipients"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.fieldDivider} />
            </>
          )}

          {/* Bcc field */}
          {showBcc && (
            <>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Bcc</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={bccField}
                  onChangeText={setBccField}
                  placeholder="Bcc recipients"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.fieldDivider} />
            </>
          )}

          {/* Subject */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Subject</Text>
            {isNewCompose || mode === "forward" ? (
              <TextInput
                style={styles.fieldInput}
                value={subject}
                onChangeText={setSubject}
                placeholder="Subject"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="sentences"
              />
            ) : (
              <Text style={styles.subjectText} numberOfLines={1}>
                {subject}
              </Text>
            )}
          </View>

          <View style={styles.fieldDivider} />

          {/* Body */}
          <TextInput
            style={styles.bodyInput}
            value={body}
            onChangeText={setBody}
            placeholder="Write your message..."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            autoFocus={!isNewCompose && mode !== "forward"}
          />

          {/* Original message preview (for reply/reply-all only) */}
          {email && (mode === "reply" || mode === "reply-all") && (
            <View style={styles.originalSection}>
              <View style={styles.originalHeader}>
                <View style={styles.originalDividerLine} />
                <Text style={styles.originalLabel}>Original message</Text>
                <View style={styles.originalDividerLine} />
              </View>
              <View style={styles.originalCard}>
                <Text style={styles.originalFrom}>
                  From: {email.from.name || email.from.email}
                </Text>
                <Text style={styles.originalDate}>
                  {new Date(email.receivedAt).toLocaleString()}
                </Text>
                <Text style={styles.originalBody} numberOfLines={20}>
                  {email.bodyText}
                </Text>
              </View>
            </View>
          )}
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
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  scrollInner: {
    paddingBottom: spacing.xxl,
  },

  // --- Fields ---
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surface,
  },
  fieldLabel: {
    width: 55,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  fieldInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textMain,
    paddingVertical: 0,
  },
  ccBccToggles: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  ccToggle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
  },
  subjectText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textMain,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 55,
  },

  // --- Body ---
  bodyInput: {
    flex: 1,
    minHeight: 200,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textMain,
    lineHeight: 24,
    backgroundColor: colors.surface,
  },

  // --- Original message ---
  originalSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  originalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  originalDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  originalLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  originalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
  },
  originalFrom: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMain,
    marginBottom: 2,
  },
  originalDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  originalBody: {
    fontSize: fontSize.sm,
    color: colors.textBody,
    lineHeight: 20,
  },
});
