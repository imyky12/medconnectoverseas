import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export interface User {
  id: string;
  email: string;
  isOnboardingComplete: boolean;
  role: string;
  firstName?: string;
  lastName?: string;
  referralCode?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }, []);

  /**
   * Decide who is signed in — asking the server, not just localStorage.
   *
   * An unexpired JWT proves the token was issued, not that the account behind
   * it still exists. Trusting storage alone left people looking signed in
   * after their account was deleted, right up until something happened to call
   * a protected endpoint. So the stored user paints the first frame (no logged
   * -out flicker on every reload) and `/auth/me` confirms or revokes it.
   */
  useEffect(() => {
    let cancelled = false;
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');

    if (!storedUser || !token || isTokenExpired(token)) {
      clearSession();
      setIsLoading(false);
      return;
    }

    try {
      setUser(JSON.parse(storedUser));
    } catch (err) {
      console.error('Failed to parse user from local storage', err);
      clearSession();
      setIsLoading(false);
      return;
    }

    api
      .get<any>('/auth/me')
      .then((res: any) => {
        if (cancelled || !res?.success || !res.data) return;
        // Also picks up anything changed elsewhere since this device last
        // looked — a name edited on another browser, onboarding finished.
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '';
        // Only a rejected session signs someone out. A backend that is down or
        // unreachable must not throw people out of an otherwise good session.
        if (/no longer exists|suspended|token|unauthor/i.test(message)) clearSession();
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [clearSession]);

  const login = (userData: User, accessToken: string, refreshToken: string) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  };

  const logout = () => {
    clearSession();
    window.location.href = '/';
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updatedUser = { ...prev, ...userData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
