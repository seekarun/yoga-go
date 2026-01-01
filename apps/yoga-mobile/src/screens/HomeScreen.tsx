import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
} from "../config/theme";

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.brandName}>my yoga</Text>
          <Text style={styles.brandGuru}>guru</Text>
        </View>

        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || user?.email}</Text>
        </View>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Your courses and content will appear here
          </Text>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
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
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  brandName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.light,
    color: colors.textMain,
  },
  brandGuru: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  welcomeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  userName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.textMain,
    marginTop: spacing.xs,
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  placeholderText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: "center",
  },
  signOutButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  signOutText: {
    color: colors.textBody,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
});
