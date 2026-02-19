import React from "react";
import { TouchableOpacity, StyleSheet, Text } from "react-native";
import { colors, spacing } from "../config/theme";

interface ChatBubbleProps {
  onPress: () => void;
}

export default function ChatBubble({ onPress }: ChatBubbleProps) {
  return (
    <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.icon}>💬</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  icon: {
    fontSize: 24,
  },
});
