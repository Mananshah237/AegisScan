import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import {
  getToken,
  setToken,
  removeToken,
  getRefreshToken,
  removeRefreshToken,
} from '@/lib/utils';

// Vite env vars are baked at build time; fall back to localhost for local dev.
const API_ROOT = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_ROOT}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the bearer token to every request.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// One-shot refresh on 401, then retry the original request once.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    // /auth/refresh takes refresh_token as a query parameter.
    const resp = await axios.post(
      `${API_ROOT}/api/v1/auth/refresh`,
      null,
      { params: { refresh_token: refresh } },
    );
    const newToken = resp.data?.access_token as string | undefined;
    if (newToken) {
      setToken(newToken);
      return newToken;
    }
    return null;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry) {
      original._retry = true;
      refreshing = refreshing ?? refreshAccessToken();
      const newToken = await refreshing;
      refreshing = null;

      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }

      // Refresh failed — clear session and bounce to login.
      removeToken();
      removeRefreshToken();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
