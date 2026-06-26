import { api } from "./api";
import { Content, ContentType, PaginatedResponse } from "@/types";

export async function searchContent(params: {
  q: string;
  type?: ContentType;
  tag?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  ownerId?: string;
}): Promise<PaginatedResponse<Content>> {
  const res = await api.get("/search", { params });
  return res.data.data;
}
