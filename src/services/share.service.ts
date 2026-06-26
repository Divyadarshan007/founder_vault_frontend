import { api } from "./api";
import { Share } from "@/types";

export interface SharesData {
  sent: Share[];
  received: Share[];
}

export async function inviteUserByEmail(email: string): Promise<Share> {
  const res = await api.post("/shares/invite", { email });
  return res.data.data;
}

export async function listShares(): Promise<SharesData> {
  const res = await api.get("/shares");
  return res.data.data;
}

export async function acceptShare(shareId: string): Promise<Share> {
  const res = await api.post("/shares/accept", { shareId });
  return res.data.data;
}

export async function revokeShare(shareId: string): Promise<Share> {
  const res = await api.delete(`/shares/${shareId}`);
  return res.data.data;
}

export async function inviteUserById(userId: string): Promise<Share> {
  const res = await api.post("/shares/invite-by-id", { userId });
  return res.data.data;
}
