import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const inFlightLoginRef = useRef<Promise<User> | null>(null);
  const inFlightRefreshRef = useRef<Promise<void> | null>(null);

  const refreshUser = async (): Promise<void> => {
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
        console.error('Failed to restore session:', err);
        api.logout();
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
    if (inFlightLoginRef.current) {
      return inFlightLoginRef.current;
    }

    setIsLoading(true);
    const promise = (async () => {
      try {
        const res = await api.login(email, pass);
        setUser(res.user);
        return res.user;
      } finally {
        setIsLoading(false);
        inFlightLoginRef.current = null;
      }
    })();

    inFlightLoginRef.current = promise;
    return promise;
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        isLoading,
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
