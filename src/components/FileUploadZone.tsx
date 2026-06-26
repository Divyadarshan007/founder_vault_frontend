"use client";

import { useCallback, useState } from "react";
import { Upload, X, FileText, Music, Video, Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadFile {
  file: File;
  preview?: string;
}

interface Props {
  files: UploadFile[];
  onChange: (files: UploadFile[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  accept?: string;
  hint?: string;
}

function fileIcon(type: string) {
  if (type.startsWith("image/")) return Image;
  if (type.startsWith("video/")) return Video;
  if (type.startsWith("audio/")) return Music;
  return FileText;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ACCEPTED_TYPES = [
  "image/jpeg", "image/png", "image/webp",
  "video/mp4", "video/quicktime",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a",
].join(",");

export function FileUploadZone({ files, onChange, maxFiles = 5, disabled, accept, hint }: Props) {
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return;
      const toAdd: UploadFile[] = [];
      for (const file of Array.from(newFiles)) {
        if (files.length + toAdd.length >= maxFiles) break;
        const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
        toAdd.push({ file, preview });
      }
      onChange([...files, ...toAdd]);
    },
    [files, maxFiles, onChange]
  );

  function remove(index: number) {
    const updated = [...files];
    if (updated[index].preview) URL.revokeObjectURL(updated[index].preview!);
    updated.splice(index, 1);
    onChange(updated);
  }

  return (
    <div className="space-y-3">
      <label
        className={cn(
          "flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
      >
        <Upload className="w-8 h-8 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">Drop files here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">
            {hint ?? "Images, videos, audio, PDF, DOCX — up to 100 MB each"} · max {maxFiles} files
          </p>
        </div>
        <input
          type="file"
          className="sr-only"
          accept={accept ?? ACCEPTED_TYPES}
          multiple
          disabled={disabled}
          onChange={(e) => addFiles(e.target.files)}
        />
      </label>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => {
            const Icon = fileIcon(f.file.type);
            return (
              <li key={i} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                {f.preview ? (
                  <img src={f.preview} alt="" className="w-10 h-10 object-cover rounded" />
                ) : (
                  <Icon className="w-10 h-10 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(f.file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
