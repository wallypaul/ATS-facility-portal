import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { tokenStore, type Session } from './tokenStore';
import { login as loginRequest, logout as logoutRequest } from '../api/auth';
import type { User } from '../api/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isPayer: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // The token store lives outside React (the axios interceptor writes to it on
  // refresh/expiry); useSyncExternalStore keeps React in lockstep with it.
  const session = useSyncExternalStore(tokenStore.subscribe, tokenStore.get, tokenStore.get);

  const login = useCallback(async (email: string, password: string) => {
    const { access, refresh, user } = await loginRequest(email, password);
    tokenStore.set({ tokens: { access, refresh }, user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    const refresh = tokenStore.getRefresh();
    try {
      if (refresh) await logoutRequest(refresh);
    } catch {
      // Any logout outcome means "clear + go to login".
    } finally {
      tokenStore.clear();
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
      isPayer: session?.user.user_type === 'payer',
      login,
      logout,
    }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
