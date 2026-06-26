import { api } from "./api";
import { User } from "@/types";

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export async function register(data: {
  name: string;
  email: string;
  password: string;
  companyName: string;
  designation: string;
}): Promise<AuthResponse> {
  const res = await api.post("/auth/register", data);
  return res.data.data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post("/auth/login", { email, password });
  return res.data.data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}
