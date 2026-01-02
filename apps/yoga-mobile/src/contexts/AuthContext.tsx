import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import * as SecureStore from "expo-secure-store";
import type { User } from "../services/auth";
import { API_BASE_URL } from "../config/api";

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (
    user: User,
    accessToken: string,
    refreshToken: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isRefreshing = useRef(false);

  // Check if token is expired (with 5 min buffer)
  const isTokenExpired = (token: string): boolean => {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      return Date.now() > exp - 5 * 60 * 1000; // 5 min buffer
    } catch {
      return true;
    }
  };

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const currentRefreshToken =
      await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    const currentAccessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

    if (!currentRefreshToken) {
      console.log("[AuthContext] No refresh token available");
      return null;
    }

    // Prevent multiple simultaneous refresh calls
    if (isRefreshing.current) {
      console.log("[AuthContext] Token refresh already in progress");
      // Wait for the current refresh to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    }

    isRefreshing.current = true;

    try {
      console.log("[AuthContext] Refreshing access token...");

      const response = await fetch(`${API_BASE_URL}/api/auth/mobile/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(currentAccessToken && {
            Authorization: `Bearer ${currentAccessToken}`,
          }),
        },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });

      const data = await response.json();

      if (data.success && data.accessToken) {
        console.log("[AuthContext] Token refreshed successfully");
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
        setAccessToken(data.accessToken);
        return data.accessToken;
      } else {
        console.error("[AuthContext] Token refresh failed:", data.message);
        // If refresh fails, sign out
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);
        return null;
      }
    } catch (error) {
      console.error("[AuthContext] Error refreshing token:", error);
      return null;
    } finally {
      isRefreshing.current = false;
    }
  }, []);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedAccessToken =
        await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const storedRefreshToken =
        await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      const storedUser = await SecureStore.getItemAsync(USER_KEY);

      if (storedAccessToken && storedUser) {
        // Check if token is expired and refresh if needed
        if (isTokenExpired(storedAccessToken) && storedRefreshToken) {
          console.log("[AuthContext] Stored token expired, refreshing...");
          setRefreshToken(storedRefreshToken);
          setUser(JSON.parse(storedUser));

          const newToken = await refreshAccessToken();
          if (!newToken) {
            // Refresh failed, user needs to login again
            console.log("[AuthContext] Token refresh failed, clearing auth");
            return;
          }
        } else {
          setAccessToken(storedAccessToken);
          setRefreshToken(storedRefreshToken);
          setUser(JSON.parse(storedUser));
        }
      }
    } catch (error) {
      console.error("[AuthContext] Error loading stored auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = useCallback(
    async (newUser: User, newAccessToken: string, newRefreshToken: string) => {
      try {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser));
        setAccessToken(newAccessToken);
        setRefreshToken(newRefreshToken);
        setUser(newUser);
      } catch (error) {
        console.error("[AuthContext] Error saving auth:", error);
        throw error;
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    } catch (error) {
      console.error("[AuthContext] Error clearing auth:", error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isLoading,
        isAuthenticated: !!user && !!accessToken,
        signIn,
        signOut,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
