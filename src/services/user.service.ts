import { api } from "./api";
import { User, PaginatedResponse } from "@/types";

export async function getProfile(): Promise<User> {
  const res = await api.get("/users/profile");
  return res.data.data;
}

export async function updateProfile(data: Partial<{
  name: string;
  companyName: string;
  designation: string;
  bio: string;
  profileImage: string;
}>): Promise<User> {
  const res = await api.put("/users/profile", data);
  return res.data.data;
}

export async function getUserById(id: string): Promise<User> {
  const res = await api.get(`/users/${id}`);
  return res.data.data;
}

export async function listAgencies(search: string, page: number, limit: number): Promise<PaginatedResponse<User>> {
  const res = await api.get("/users/agencies", { params: { search, page, limit } });
  return res.data.data;
}
