'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
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

  const login = () => {
    console.log('[DBG][AuthContext] Redirecting to Auth0 login');
    // Redirect to Auth0 login page (handled by middleware)
    window.location.href = '/auth/login';
  };

  const logout = async () => {
    console.log('[DBG][AuthContext] Logging out');
    setUser(null);
    setIsAuthenticated(false);
    // Redirect to Auth0 logout endpoint (handled by middleware)
    window.location.href = '/auth/logout';
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
