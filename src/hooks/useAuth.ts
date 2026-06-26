"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import * as authService from "@/services/auth.service";
import { setAuthCookie, clearAuthCookie } from "@/lib/cookies";

export function useAuth() {
  const { user, accessToken, setAuth, clearAuth } = useAuthStore();
  const router = useRouter();

  const isLoggedIn = !!accessToken && !!user;

  async function login(email: string, password: string) {
    const data = await authService.login(email, password);
    setAuth(data.user, data.accessToken, data.refreshToken);
    setAuthCookie(data.accessToken);
    router.push("/founder/content");
  }

  async function logout() {
    try {
      await authService.logout();
    } finally {
      clearAuth();
      clearAuthCookie();
      router.push("/login");
    }
  }

  async function register(formData: {
    name: string;
    email: string;
    password: string;
    companyName: string;
    designation: string;
  }) {
    const data = await authService.register(formData);
    setAuth(data.user, data.accessToken, data.refreshToken);
    setAuthCookie(data.accessToken);
    router.push("/founder/content");
  }

  return { user, isLoggedIn, login, logout, register };
}
