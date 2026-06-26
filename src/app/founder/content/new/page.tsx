"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TagInput } from "@/components/TagInput";
import { FileUploadZone } from "@/components/FileUploadZone";
import { AudioRecorder } from "@/components/AudioRecorder";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { createContent } from "@/services/content.service";
import { uploadFiles } from "@/services/upload.service";
import { ContentType } from "@/types";
import { Progress } from "@/components/ui/progress";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  type: z.enum(["THOUGHT", "EVENT", "MEETING", "VOICE_NOTE", "PHOTO", "VIDEO", "DOCUMENT"]),
});

type FormData = z.infer<typeof schema>;

interface UploadFile { file: File; preview?: string }

interface TypeConfig {
  descLabel: string;
  descPlaceholder: string;
  descRequired: boolean;
  showFiles: boolean;
  accept?: string;
  fileHint?: string;
}

const TYPE_CONFIG: Record<ContentType, TypeConfig> = {
  THOUGHT: {
    descLabel: "Your thought",
    descPlaceholder: "Write your thought, idea, or reflection…",
    descRequired: true,
    showFiles: false,
  },
  EVENT: {
    descLabel: "Event details",
    descPlaceholder: "What happened? Key highlights, outcomes, context…",
    descRequired: true,
    showFiles: true,
    fileHint: "Attach photos, presentations, or related documents",
  },
  MEETING: {
    descLabel: "Meeting notes",
    descPlaceholder: "Agenda, discussion points, decisions, action items…",
    descRequired: true,
    showFiles: true,
    fileHint: "Attach slide decks, documents, or meeting recordings",
  },
  VOICE_NOTE: {
    descLabel: "Transcript / Notes",
    descPlaceholder: "Add a transcript or summary (optional)…",
    descRequired: false,
    showFiles: true,
    accept: "audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/ogg,audio/webm",
    fileHint: "Upload audio files — MP3, WAV, M4A, OGG",
  },
  PHOTO: {
    descLabel: "Caption",
    descPlaceholder: "Describe what's in the photo or its context…",
    descRequired: false,
    showFiles: true,
    accept: "image/jpeg,image/png,image/webp,image/gif,image/heic",
    fileHint: "Upload photos — JPG, PNG, WEBP, GIF",
  },
  VIDEO: {
    descLabel: "Description",
    descPlaceholder: "What's this video about?",
    descRequired: false,
    showFiles: true,
    accept: "video/mp4,video/quicktime,video/webm",
    fileHint: "Upload video files — MP4, MOV, WEBM",
  },
  DOCUMENT: {
    descLabel: "Description",
    descPlaceholder: "Summarize the document or add context…",
    descRequired: false,
    showFiles: true,
    accept: "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain",
    fileHint: "Upload documents — PDF, DOCX, TXT",
  },
};

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "THOUGHT", label: "Thought" },
  { value: "EVENT", label: "Event" },
  { value: "MEETING", label: "Meeting" },
  { value: "VOICE_NOTE", label: "Voice Note" },
  { value: "PHOTO", label: "Photo" },
  { value: "VIDEO", label: "Video" },
  { value: "DOCUMENT", label: "Document" },
];

export default function NewContentPage() {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>([]);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "THOUGHT", description: "" },
  });

  const type = watch("type");
  const config = TYPE_CONFIG[type];

  // Clear files and recording when type changes so wrong file types don't carry over
  useEffect(() => {
    setFiles([]);
    setRecordedFile(null);
  }, [type]);

  async function onSubmit(data: FormData) {
    if (config.descRequired && !data.description?.trim()) {
      toast.error(`${config.descLabel} is required`);
      return;
    }
    setSubmitting(true);
    try {
      let attachmentIds: string[] = [];
      const allFiles = [
        ...(recordedFile ? [recordedFile] : []),
        ...files.map((f) => f.file),
      ];
      if (allFiles.length > 0) {
        const uploaded = await uploadFiles(allFiles, undefined, setUploadProgress);
        attachmentIds = uploaded.map((u) => u.attachmentId);
      }
      await createContent({ ...data, description: data.description ?? "", tags, attachmentIds });
      toast.success("Content created!");
      router.push("/founder/content");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to create content";
      toast.error(msg);
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/founder/content">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h2 className="text-2xl font-bold">New Content</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Content Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={type} onValueChange={(v) => setValue("type", v as ContentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" placeholder="What's this about?" {...register("title")} />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
              </div>

              {/* File upload before description for media types so the primary action is prominent */}
              {config.showFiles && (
                <div className="space-y-2">
                  <Label>
                    {type === "VOICE_NOTE" ? "Audio" : type === "PHOTO" ? "Photos" : type === "VIDEO" ? "Video" : "Attachments"}
                  </Label>

                  {type === "VOICE_NOTE" && (
                    <>
                      <AudioRecorder onRecorded={setRecordedFile} disabled={submitting} />
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex-1 h-px bg-border" />
                        or upload a file
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    </>
                  )}

                  <FileUploadZone
                    files={files}
                    onChange={setFiles}
                    disabled={submitting}
                    accept={config.accept}
                    hint={config.fileHint}
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">
                    {config.descLabel}
                    {config.descRequired ? " *" : " (optional)"}
                  </Label>
                  <VoiceInputButton
                    disabled={submitting}
                    onTranscript={(text) => {
                      const current = getValues("description") ?? "";
                      setValue("description", current ? `${current} ${text}` : text, { shouldValidate: true });
                    }}
                  />
                </div>
                <Textarea
                  id="description"
                  placeholder={config.descPlaceholder}
                  rows={4}
                  {...register("description")}
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <TagInput tags={tags} onChange={setTags} placeholder="Add tags (press Enter or comma)" />
              </div>

              {/* General attachments for text-based types that don't need a specific upload */}
              {!config.showFiles && (
                <div className="space-y-2">
                  <Label>Attachments <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <FileUploadZone files={files} onChange={setFiles} disabled={submitting} />
                </div>
              )}

              {submitting && uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Uploading files… {uploadProgress}%</p>
                  <Progress value={uploadProgress} />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? "Saving…" : "Save Content"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
