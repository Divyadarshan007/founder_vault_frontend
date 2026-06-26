import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth.store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Inject access token directly from Zustand store (works reliably outside React components)
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, try refresh then retry
let refreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isAuthEndpoint = original.url?.includes("/auth/");
    if (error.response?.status !== 401 || original._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (refreshing) {
      return new Promise((resolve) => {
        queue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    original._retry = true;
    refreshing = true;

    try {
      const { refreshToken, updateToken, clearAuth } = useAuthStore.getState();
      const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      const newToken: string = data.data.accessToken;

      updateToken(newToken);

      queue.forEach((cb) => cb(newToken));
      queue = [];

      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch {
      queue = [];
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
      return Promise.reject(error);
    } finally {
      refreshing = false;
    }
  }
);
