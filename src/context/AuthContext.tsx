import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSubmitting?: boolean;
  login: (email: string, pass: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const inFlightLoginRef = useRef<Promise<User> | null>(null);
  const inFlightRefreshRef = useRef<Promise<void> | null>(null);

  // Listen for centralized session expiration events
  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setIsLoading(false);
      setIsSubmitting(false);
      inFlightRefreshRef.current = null;
      inFlightLoginRef.current = null;
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []);

  const refreshUser = async (): Promise<void> => {
    // If a session check is already in-flight, return the shared promise
    if (inFlightRefreshRef.current) {
      return inFlightRefreshRef.current;
    }

    const token = localStorage.getItem('bus_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const promise = (async () => {
      try {
        const res = await api.getCurrentUser();
        setUser(res.user);
      } catch (err) {
        // Cleanly clear state on failure without firing cascading 401s or redundant logout queries
        setUser(null);
      } finally {
        setIsLoading(false);
        inFlightRefreshRef.current = null;
      }
    })();

    inFlightRefreshRef.current = promise;
    return promise;
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    // Prevent duplicate login submissions with strict loading state locking
    if (inFlightLoginRef.current) {
      return inFlightLoginRef.current;
    }

    setIsSubmitting(true);
    setIsLoading(true);
    const promise = (async () => {
      try {
        const res = await api.login(email, pass);
        setUser(res.user);
        return res.user;
      } finally {
        setIsLoading(false);
        setIsSubmitting(false);
        inFlightLoginRef.current = null;
      }
    })();

    inFlightLoginRef.current = promise;
    return promise;
  };

  const logout = () => {
    // Cleanly clear state and invalidate token on server without redundant queries
    api.logout();
    setUser(null);
    setIsLoading(false);
    setIsSubmitting(false);
    inFlightRefreshRef.current = null;
    inFlightLoginRef.current = null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        isLoading,
        isSubmitting,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
