import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clearAccessToken, getAccessToken, setAccessToken } from './token';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  // Fail fast instead of hanging the skeletons forever on a stalled request.
  timeout: 15000
});

// Single-flight refresh: parallel 401s (bootstrap + page fetches) must share
// one refresh call. The backend rotates the refresh token on every use, so
// concurrent refreshes invalidate each other and cause random logouts.
let pendingRefresh: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (pendingRefresh) return pendingRefresh;
  pendingRefresh = axios
    .post(`${baseURL}/api/auth/refresh`, {}, { withCredentials: true, timeout: 10000 })
    .then((res) => {
      const next = res.data?.accessToken as string | undefined;
      if (next) setAccessToken(next);
      return next ?? null;
    })
    .catch(() => {
      clearAccessToken();
      return null;
    })
    .finally(() => {
      pendingRefresh = null;
    });
  return pendingRefresh;
}

function isRefreshRequest(config?: InternalAxiosRequestConfig) {
  return config?.url?.includes('/api/auth/refresh') ?? false;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    // Never retry the refresh call itself — that would double-fire rotation
    // and turn one expired session into a refresh storm.
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isRefreshRequest(originalRequest)) {
      originalRequest._retry = true;
      try {
        const nextAccessToken = await refreshAccessToken();
        if (nextAccessToken) {
          originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
          return api.request(originalRequest);
        }
      } catch {
        clearAccessToken();
      }
    }
    return Promise.reject(error);
  }
);
