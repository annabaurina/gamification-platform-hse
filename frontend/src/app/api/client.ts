import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const BASE_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL)
  ? import.meta.env.VITE_API_BASE_URL
  : "http://127.0.0.1:8000/api";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Callback to clear auth and trigger logout in React — set by AuthProvider
let _logoutCallback: (() => void) | null = null;
export function setLogoutCallback(fn: () => void) {
  _logoutCallback = fn;
}

// Token refresh queue management
let isRefreshing = false;
type QueueItem = { resolve: (token: string) => void; reject: (err: unknown) => void };
let failedQueue: QueueItem[] = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  failedQueue = [];
}

function clearSessionAndLogout() {
  localStorage.removeItem("hse_access_token");
  localStorage.removeItem("hse_refresh_token");
  localStorage.removeItem("hse_user");
  if (_logoutCallback) _logoutCallback();
}

// Attach Bearer token to every request
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("hse_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401: attempt token refresh, queue concurrent requests
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      // Prevent retrying a token-refresh request itself
      if (original.url === "/token/refresh/") {
        clearSessionAndLogout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              original.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(original));
            },
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("hse_refresh_token");
      if (!refreshToken) {
        clearSessionAndLogout();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/token/refresh/`, {
          refresh: refreshToken,
        });
        const newAccess: string = data.access;
        localStorage.setItem("hse_access_token", newAccess);
        processQueue(null, newAccess);
        original.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearSessionAndLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Utility: unwrap DRF response (handles both array and paginated object)
export function unwrapList<T>(data: T[] | { results: T[] }): T[] {
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}
