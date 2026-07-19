// Auth API — login uses a bare axios (no Bearer needed / no refresh loop);
// the rest go through the shared instance so they carry the token.

import axios from 'axios';
import { api } from './client';
import type { LoginResponse } from './types';

const baseURL = import.meta.env.VITE_API_BASE;

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await axios.post<LoginResponse>(
    `${baseURL}/user/auth/portal-login/`,
    { email, password },
  );
  return data;
}

export async function logout(refresh: string): Promise<void> {
  // Bearer header + refresh body; treat any outcome as "clear + go to login".
  await api.post('/user/auth/logout/', { refresh });
}

export async function changePassword(
  current_password: string,
  new_password: string,
): Promise<void> {
  await api.post('/user/auth/password-change/', { current_password, new_password });
}

// Forgot-password (logged-out) flow — step 1: email a 6-digit code. Always
// resolves 200 (server never reveals whether the email has an account).
export async function requestPasswordReset(email: string): Promise<{ detail: string }> {
  const { data } = await axios.post<{ detail: string }>(
    `${baseURL}/user/auth/password-reset/`,
    { email },
  );
  return data;
}

// Step 2: submit the emailed code + new password.
export async function confirmPasswordReset(
  email: string,
  code: string,
  new_password: string,
): Promise<void> {
  await axios.post(`${baseURL}/user/auth/password-reset/confirm/`, { email, code, new_password });
}
