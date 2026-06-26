import { api } from "./api";
import { UploadedAttachment } from "@/types";

export async function uploadFiles(
  files: File[],
  contentId?: string,
  onProgress?: (percent: number) => void
): Promise<UploadedAttachment[]> {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  if (contentId) formData.append("contentId", contentId);

  const res = await api.post("/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return res.data.data;
}
