'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
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
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserDetails = useCallback(async () => {
    if (status === 'loading') {
      return;
    }

    if (!session) {
      console.log('[DBG][AuthContext] No session, setting user to null');
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      console.log('[DBG][AuthContext] Fetching user details from /api/auth/me');
      const response = await fetch('/api/auth/me');
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
  }, [session, status]);

  const login = (returnTo?: string) => {
    console.log('[DBG][AuthContext] Redirecting to signin page');
    const returnPath = returnTo || '/app';
    // Use custom signin page
    window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(returnPath)}`;
  };

  const logout = async (returnTo?: string) => {
    console.log('[DBG][AuthContext] ========== LOGOUT INITIATED ==========');
    console.log('[DBG][AuthContext] returnTo:', returnTo);
    console.log('[DBG][AuthContext] Current session before logout:', session ? 'exists' : 'null');
    console.log('[DBG][AuthContext] Current user before logout:', user ? user.id : 'null');
    setUser(null);
    // Use custom logout handler which clears both NextAuth and Cognito sessions
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

  useEffect(() => {
    console.log('[DBG][AuthContext] ========== SESSION UPDATE ==========');
    console.log('[DBG][AuthContext] Session status:', status);
    console.log(
      '[DBG][AuthContext] Session data:',
      session ? JSON.stringify(session, null, 2) : 'null'
    );
    console.log('[DBG][AuthContext] Current user state:', user ? user.id : 'null');
    if (status !== 'loading') {
      fetchUserDetails();
    }
  }, [status, fetchUserDetails]);

  const value = {
    user,
    isAuthenticated: !!session,
    isLoading: status === 'loading' || isLoading,
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
