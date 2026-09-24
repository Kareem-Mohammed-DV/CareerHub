import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { login as loginRequest } from '../api/auth';
import { api } from '../api/client';

export type UserRole = 'JOB_SEEKER' | 'COMPANY' | 'ADMIN';
export type SessionUser = { id: string; email: string; role: UserRole; status: string };
type AuthValue = { user: SessionUser | null; ready: boolean; signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void> };

const AuthContext = createContext<AuthValue | null>(null);
const USER_KEY = 'careerhub.user';

function readUser(): SessionUser | null {
  try {
    const value = localStorage.getItem(USER_KEY);
    return value ? JSON.parse(value) as SessionUser : null;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(readUser);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const clear = () => setUser(null);
    window.addEventListener('careerhub:unauthorized', clear);
    return () => window.removeEventListener('careerhub:unauthorized', clear);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || !user) {
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem(USER_KEY);
      setReady(true);
      return;
    }
    fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1'}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Session expired');
        const body = await response.json() as { data?: { accessToken?: string } };
        if (body.data?.accessToken) localStorage.setItem('accessToken', body.data.accessToken);
      })
      .catch(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem(USER_KEY);
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password) as { accessToken: string; user: SessionUser };
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    setUser(result.user);
  }, []);

  const signOut = useCallback(async () => {
    try { await api<void>('/auth/logout', { method: 'POST' }); } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem(USER_KEY);
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, ready, signIn, signOut }), [user, ready, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
