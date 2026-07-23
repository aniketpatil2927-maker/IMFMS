import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';
import { authApi } from '../services/auth';
import type { Role, User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('hkbams_user');
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('hkbams_token'));
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (!localStorage.getItem('hkbams_token')) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.me();
      if (data.data) {
        setUser(data.data);
        localStorage.setItem('hkbams_user', JSON.stringify(data.data));
      }
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('hkbams_token');
      localStorage.removeItem('hkbams_user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshUser();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      async login(email, password) {
        const { data } = await authApi.login(email, password);
        if (!data.data) throw new Error(data.message || 'Login failed');
        localStorage.setItem('hkbams_token', data.data.token);
        localStorage.setItem('hkbams_user', JSON.stringify(data.data.user));
        setToken(data.data.token);
        setUser(data.data.user);
      },
      logout() {
        localStorage.removeItem('hkbams_token');
        localStorage.removeItem('hkbams_user');
        setToken(null);
        setUser(null);
      },
      hasRole(...roles) {
        return !!user && roles.includes(user.role);
      },
      refreshUser,
    }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
