import { api } from "./api";

export async function transcribeAudio(file: File): Promise<string> {
  const form = new FormData();
  form.append("audio", file);
  const { data } = await api.post<{ text: string }>("/transcribe", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.text;
}
