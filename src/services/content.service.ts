import { api } from "./api";
import { Content, ContentFilters, ContentStats, ContentType, PaginatedResponse } from "@/types";

export async function createContent(data: {
  title: string;
  description: string;
  type: ContentType;
  tags?: string[];
  transcript?: string;
  attachmentIds?: string[];
}): Promise<Content> {
  const res = await api.post("/content", data);
  return res.data.data;
}

export async function listContent(filters: ContentFilters = {}): Promise<PaginatedResponse<Content>> {
  const res = await api.get("/content", { params: filters });
  return res.data.data;
}

export async function getContent(id: string): Promise<Content> {
  const res = await api.get(`/content/${id}`);
  return res.data.data;
}

export async function updateContent(id: string, data: Partial<{
  title: string;
  description: string;
  type: ContentType;
  tags: string[];
  transcript: string;
  attachmentIds: string[];
}>): Promise<Content> {
  const res = await api.put(`/content/${id}`, data);
  return res.data.data;
}

export async function deleteContent(id: string): Promise<void> {
  await api.delete(`/content/${id}`);
}

export async function getContentStats(): Promise<ContentStats> {
  const res = await api.get("/content/stats");
  return res.data.data;
}
