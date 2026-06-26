"use client";

export function setAuthCookie(token: string) {
  const val = JSON.stringify({ token });
  document.cookie = `fv_auth=${encodeURIComponent(val)}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
}

export function clearAuthCookie() {
  document.cookie = "fv_auth=; path=/; max-age=0";
}
