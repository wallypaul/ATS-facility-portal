// Single source of truth for the session: tokens + user held in memory, mirrored
// to a cookie so a page reload survives. The axios interceptor and React both read
// through here. Subscribers let React re-render when the session changes (login,
// refresh-rotation, logout, or a failed refresh clearing everything).
//
// ponytail: cookie is JS-readable (not HttpOnly) — the backend returns tokens in
// the response body, so a readable cookie is the only way to persist them. Same
// XSS exposure as localStorage. Upgrade path: server-set HttpOnly refresh cookie.

import type { AuthTokens, User } from '../api/types';

const COOKIE_KEY = 'ats.portal.tokens';

export interface Session {
  tokens: AuthTokens;
  user: User;
}

let session: Session | null = null;
const listeners = new Set<() => void>();

function readCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  // Secure only over https — a Secure cookie is dropped on http://localhost, which
  // would break "reload keeps you signed in" in dev. SameSite=Strict + path=/.
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  const maxAge = 60 * 60 * 24 * 7; // 7 days; refresh token rotates on use
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Strict${secure}`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Strict`;
}

function notify() {
  listeners.forEach((l) => l());
}

// Hydrate once at module load.
(function hydrate() {
  const raw = readCookie(COOKIE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Session;
    if (parsed?.tokens?.access && parsed?.tokens?.refresh && parsed?.user) {
      session = parsed;
    }
  } catch {
    deleteCookie(COOKIE_KEY);
  }
})();

export const tokenStore = {
  get(): Session | null {
    return session;
  },

  getAccess(): string | null {
    return session?.tokens.access ?? null;
  },

  getRefresh(): string | null {
    return session?.tokens.refresh ?? null;
  },

  set(next: Session) {
    session = next;
    writeCookie(COOKIE_KEY, JSON.stringify(next));
    notify();
  },

  // Update just the tokens (refresh rotation) while keeping the same user.
  setTokens(tokens: AuthTokens) {
    if (!session) return;
    session = { ...session, tokens };
    writeCookie(COOKIE_KEY, JSON.stringify(session));
    notify();
  },

  clear() {
    session = null;
    deleteCookie(COOKIE_KEY);
    notify();
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
