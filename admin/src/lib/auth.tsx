'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, Admin, AuthError } from './api';

interface AuthContextType {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('sunia_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.me()
      .then(({ admin }) => setAdmin(admin))
      .catch((err) => {
        if (err instanceof AuthError) {
          localStorage.removeItem('sunia_token');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { token, admin } = await api.login(email, password);
    localStorage.setItem('sunia_token', token);
    setAdmin(admin);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('sunia_token');
    setAdmin(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
