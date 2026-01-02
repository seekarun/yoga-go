import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/AppNavigator";
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

type ReplyScreenRouteProp = RouteProp<RootStackParamList, "Reply">;

export default function ReplyScreen() {
  const navigation = useNavigation();
  const route = useRoute<ReplyScreenRouteProp>();
  const { emailId, toEmail, toName, subject } = route.params;
  const { accessToken } = useAuth();

  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
  const toDisplay = toName ? `${toName} <${toEmail}>` : toEmail;

  const handleSend = async () => {
    if (!body.trim()) {
      Alert.alert("Error", "Please enter a message");
      return;
    }

    if (!accessToken) {
      Alert.alert("Error", "Not authenticated");
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/data/app/expert/me/inbox/${emailId}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            body: body.trim(),
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        Alert.alert("Success", "Reply sent", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("Error", data.error || "Failed to send reply");
      }
    } catch (err) {
      console.error("[DBG][ReplyScreen] Error sending reply:", err);
      Alert.alert("Error", "Failed to connect to server");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reply</Text>
        <TouchableOpacity
          style={[styles.sendButton, !body.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={isSending || !body.trim()}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView style={styles.scrollView}>
          {/* To Field */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>To:</Text>
            <Text style={styles.fieldValue}>{toDisplay}</Text>
          </View>

          {/* Subject Field */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Subject:</Text>
            <Text style={styles.fieldValue}>{replySubject}</Text>
          </View>

          <View style={styles.separator} />

          {/* Body Input */}
          <TextInput
            style={styles.bodyInput}
            placeholder="Write your reply..."
            placeholderTextColor={colors.textMuted}
            multiline
            value={body}
            onChangeText={setBody}
            autoFocus
            textAlignVertical="top"
          />
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
  sendButton: {
    backgroundColor: colors.primaryHover,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 60,
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  fieldRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: "#f5f5f5",
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    width: 60,
  },
  fieldValue: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textBody,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  bodyInput: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
    fontSize: fontSize.md,
    color: colors.textBody,
    minHeight: 200,
  },
});
