'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserDetails = async () => {
    try {
      console.log('[DBG][AuthContext] Fetching user details from /api/auth/me');
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (response.ok && data.success && data.data) {
        console.log('[DBG][AuthContext] User authenticated:', data.data.id);
        setUser(data.data);
        setIsAuthenticated(true);
      } else {
        console.log('[DBG][AuthContext] User not authenticated:', data.error);
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('[DBG][AuthContext] Error fetching user details:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (returnTo?: string) => {
    console.log('[DBG][AuthContext] Redirecting to Auth0 login');
    const returnPath = returnTo || '/app';
    window.location.href = `/auth/login?returnTo=${encodeURIComponent(returnPath)}`;
  };

  const logout = async (returnTo?: string) => {
    console.log('[DBG][AuthContext] Logging out', returnTo ? `with returnTo: ${returnTo}` : '');
    setUser(null);
    setIsAuthenticated(false);
    // Redirect to Auth0 logout endpoint with optional returnTo
    const logoutUrl = returnTo
      ? `/auth/logout?returnTo=${encodeURIComponent(returnTo)}`
      : '/auth/logout';
    window.location.href = logoutUrl;
  };

  const refreshUser = async () => {
    console.log('[DBG][AuthContext] Refreshing user data');
    await fetchUserDetails();
  };

  useEffect(() => {
    console.log('[DBG][AuthContext] Checking authentication status');
    fetchUserDetails();
  }, []);

  const value = {
    user,
    isAuthenticated,
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
