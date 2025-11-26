'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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
    console.log('[DBG][AuthContext] Fetching user details from /api/auth/me');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Important: include cookies
      });
      const data = await response.json();

      if (response.ok && data.success && data.data) {
        console.log('[DBG][AuthContext] User authenticated:', data.data.id);
        setUser(data.data);
      } else {
        console.log('[DBG][AuthContext] User not authenticated:', data.error);
        setUser(null);
      }
    } catch (error) {
      console.error('[DBG][AuthContext] Error fetching user details:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (returnTo?: string) => {
    console.log('[DBG][AuthContext] Redirecting to signin page');
    const returnPath = returnTo || '/app';
    window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(returnPath)}`;
  };

  const logout = async (returnTo?: string) => {
    console.log('[DBG][AuthContext] ========== LOGOUT INITIATED ==========');
    console.log('[DBG][AuthContext] returnTo:', returnTo);
    console.log('[DBG][AuthContext] Current user before logout:', user ? user.id : 'null');
    setUser(null);
    const logoutUrl = returnTo
      ? `/auth/logout?returnTo=${encodeURIComponent(returnTo)}`
      : '/auth/logout';
    console.log('[DBG][AuthContext] Redirecting to:', logoutUrl);
    window.location.href = logoutUrl;
  };

  const refreshUser = async () => {
    console.log('[DBG][AuthContext] Refreshing user data');
    await fetchUserDetails();
  };

  // Check auth status on mount
  useEffect(() => {
    if (!hasCheckedAuth.current) {
      hasCheckedAuth.current = true;
      console.log('[DBG][AuthContext] Initial auth check');
      fetchUserDetails();
    }
  }, [fetchUserDetails]);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
