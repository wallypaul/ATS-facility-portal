// Single axios instance for the whole app.
//  - Request:  attach Authorization: Bearer <access>.
//  - Response: on 401, refresh ONCE (single-flight — concurrent 401s queue behind
//    one refresh call), save the rotated {access, refresh}, retry the original.
//    If refresh fails, clear the session (React redirects to /login).

import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { tokenStore } from '../auth/tokenStore';
import type { AuthTokens } from './types';

const baseURL = import.meta.env.VITE_API_BASE;

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// A bare axios (no interceptors) for the refresh call, so a 401 on refresh can't
// recurse back into this interceptor.
const refreshClient = axios.create({ baseURL });

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.request.use((config) => {
  const access = tokenStore.getAccess();
  if (access) {
    config.headers.set('Authorization', `Bearer ${access}`);
  }
  return config;
});

// Single-flight refresh: the first 401 starts the refresh; everyone else awaits it.
let refreshInFlight: Promise<AuthTokens> | null = null;

async function refreshTokens(): Promise<AuthTokens> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) throw new Error('No refresh token');

  const { data } = await refreshClient.post<Partial<AuthTokens>>(
    '/user/auth/refresh/',
    { refresh },
  );
  // SimpleJWT with rotation returns a new access and (usually) a rotated refresh.
  const next: AuthTokens = {
    access: data.access ?? '',
    refresh: data.refresh ?? refresh,
  };
  if (!next.access) throw new Error('Refresh returned no access token');
  tokenStore.setTokens(next);
  return next;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // Only refresh-retry a genuine token expiry: a 401, once, on a request that
    // carried a token and isn't itself the refresh/login call.
    const isAuthCall =
      original?.url?.includes('/user/auth/refresh/') ||
      original?.url?.includes('/user/auth/login/');

    if (status === 401 && original && !original._retried && !isAuthCall && tokenStore.getRefresh()) {
      original._retried = true;
      try {
        if (!refreshInFlight) {
          refreshInFlight = refreshTokens().finally(() => {
            refreshInFlight = null;
          });
        }
        const tokens = await refreshInFlight;
        original.headers.set('Authorization', `Bearer ${tokens.access}`);
        return api(original);
      } catch (refreshError) {
        tokenStore.clear(); // subscribers flip to unauthenticated -> RequirePayer -> /login
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
