import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { tokenStorage } from '@/lib/api/client';
import type { PublicUser } from '@/lib/api/types';

interface AuthContextValue {
  user: PublicUser | null;
  isAuthenticated: boolean;
  signIn: (token: string, user: PublicUser) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_STORAGE_KEY = 'bs_user';

function loadStoredUser(): PublicUser | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(() => loadStoredUser());

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      signIn: (token, signedInUser) => {
        tokenStorage.set(token);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(signedInUser));
        setUser(signedInUser);
      },
      signOut: () => {
        tokenStorage.clear();
        localStorage.removeItem(USER_STORAGE_KEY);
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
