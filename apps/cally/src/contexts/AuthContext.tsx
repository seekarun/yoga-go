"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import type { User, UserRole } from "@/types";

/**
 * Check if user has a specific role
 */
function hasRole(user: User | null, role: UserRole): boolean {
  if (!user || !user.role) return false;
  if (Array.isArray(user.role)) {
    return user.role.includes(role);
  }
  return user.role === role;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isExpert: boolean;
  isLearner: boolean;
  isAdmin: boolean;
  login: (returnTo?: string) => void;
  logout: (returnTo?: string) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasCheckedAuth = useRef(false);

  const fetchUserDetails = useCallback(async () => {
    console.log("[DBG][AuthContext] Fetching user details from /api/auth/me");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();

      if (response.ok && data.success && data.data) {
        console.log("[DBG][AuthContext] User authenticated:", data.data.id);
        setUser(data.data);
      } else {
        console.log("[DBG][AuthContext] User not authenticated:", data.error);
        setUser(null);
      }
    } catch (error) {
      console.error("[DBG][AuthContext] Error fetching user details:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (returnTo?: string) => {
    console.log("[DBG][AuthContext] Redirecting to signin page");
    const returnPath = returnTo || "/srv";
    window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(returnPath)}`;
  };

  const logout = (returnTo?: string) => {
    console.log("[DBG][AuthContext] Logging out");
    setUser(null);
    const logoutUrl = `/api/auth/logout${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
    window.location.href = logoutUrl;
  };

  const refreshUser = async () => {
    console.log("[DBG][AuthContext] Refreshing user data");
    await fetchUserDetails();
  };

  useEffect(() => {
    if (!hasCheckedAuth.current) {
      hasCheckedAuth.current = true;
      console.log("[DBG][AuthContext] Initial auth check");
      fetchUserDetails();
    }
  }, [fetchUserDetails]);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isExpert: hasRole(user, "expert"),
    isLearner: hasRole(user, "learner"),
    isAdmin: hasRole(user, "admin"),
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Like useAuth(), but returns null when not inside an AuthProvider.
 * Useful for components that may render in embed contexts without auth.
 */
export function useOptionalAuth(): AuthContextType | null {
  return useContext(AuthContext) ?? null;
}
