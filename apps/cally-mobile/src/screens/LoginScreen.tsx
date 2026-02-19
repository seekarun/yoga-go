import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { useAuth } from "../contexts/AuthContext";
import { login } from "../services/auth";
import { exchangeCodeForTokens } from "../services/googleAuth";
import { AUTHORIZE_ENDPOINT, COGNITO_CLIENT_ID, SCOPES } from "../config/auth";
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
} from "../config/theme";

// Required for expo-web-browser to dismiss the browser on redirect
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await login(email.trim().toLowerCase(), password);

      if (
        response.success &&
        response.user &&
        response.accessToken &&
        response.refreshToken
      ) {
        await signIn(
          response.user,
          response.accessToken,
          response.refreshToken,
        );
      } else {
        setError(response.message || "Invalid credentials");
      }
    } catch (err) {
      console.error("[LoginScreen] Error:", err);
      setError("Unable to connect to server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build the redirect URI for Expo
      const redirectUri = makeRedirectUri({ preferLocalhost: false });
      console.log("[DBG][LoginScreen] Google redirect URI:", redirectUri);

      // Build the Cognito authorize URL with identity_provider=Google
      const params = new URLSearchParams({
        client_id: COGNITO_CLIENT_ID,
        response_type: "code",
        scope: SCOPES.join(" "),
        redirect_uri: redirectUri,
        identity_provider: "Google",
        prompt: "select_account",
      });

      const authorizeUrl = `${AUTHORIZE_ENDPOINT}?${params.toString()}`;

      // Open the browser for Google authentication
      const result = await WebBrowser.openAuthSessionAsync(
        authorizeUrl,
        redirectUri,
      );

      if (result.type !== "success" || !result.url) {
        if (result.type === "cancel" || result.type === "dismiss") {
          console.log("[DBG][LoginScreen] Google sign-in cancelled");
          return;
        }
        setError("Google sign-in failed. Please try again.");
        return;
      }

      // Extract the authorization code from the redirect URL
      const url = new URL(result.url);
      const code = url.searchParams.get("code");
      const authError = url.searchParams.get("error");

      if (authError) {
        console.error("[DBG][LoginScreen] OAuth error:", authError);
        setError("Google sign-in failed. Please try again.");
        return;
      }

      if (!code) {
        setError("No authorization code received.");
        return;
      }

      // Exchange the code for tokens via our backend
      const response = await exchangeCodeForTokens(code, redirectUri);

      if (
        response.success &&
        response.user &&
        response.accessToken &&
        response.refreshToken
      ) {
        await signIn(
          response.user,
          response.accessToken,
          response.refreshToken,
        );
      } else {
        setError(response.message || "Google sign-in failed");
      }
    } catch (err) {
      console.error("[DBG][LoginScreen] Google sign-in error:", err);
      setError("Unable to complete Google sign-in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.brandTitle}>Welcome to</Text>
              <Text style={styles.brandName}>Cally</Text>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Email Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError(null);
                }}
                placeholder="Enter your email"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Password Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError(null);
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.showButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.showButtonText}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                isLoading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign In */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                isLoading && styles.googleButtonDisabled,
              ]}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            >
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Sign up via the web app at cally.app
              </Text>
            </View>
          </View>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.md + 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    marginBottom: spacing.xl,
  },
  brandTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.normal,
    color: colors.textMuted,
    lineHeight: 28,
  },
  brandName: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    lineHeight: 44,
  },
  errorBox: {
    backgroundColor: colors.errorBg,
    padding: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
  },
  inputContainer: {
    marginBottom: spacing.md + 4,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textBody,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.textMain,
    backgroundColor: colors.surface,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: spacing.md,
    paddingRight: spacing.xxl,
    fontSize: fontSize.md,
    color: colors.textMain,
  },
  showButton: {
    position: "absolute",
    right: 12,
    paddingVertical: 12,
  },
  showButtonText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  loginButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    color: colors.textBody,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  footer: {
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: "center",
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
