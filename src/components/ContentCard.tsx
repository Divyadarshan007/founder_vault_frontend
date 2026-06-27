"use client";

import Link from "next/link";
import { FileText, Music, Video, File } from "lucide-react";
import { ContentTypeBadge } from "./ContentTypeBadge";
import { Content, Attachment } from "@/types";
import { format } from "date-fns";

interface Props {
  content: Content;
  href?: string;
}

function FileIcon({ fileType }: { fileType: string }) {
  if (fileType.startsWith("audio/")) return <Music className="w-3.5 h-3.5 shrink-0" />;
  if (fileType.startsWith("video/")) return <Video className="w-3.5 h-3.5 shrink-0" />;
  if (fileType === "application/pdf" || fileType.includes("document") || fileType.includes("text"))
    return <FileText className="w-3.5 h-3.5 shrink-0" />;
  return <File className="w-3.5 h-3.5 shrink-0" />;
}

function getFileLabel(fileName: string, fileType: string): string {
  const ext = fileName.split(".").pop()?.toUpperCase();
  if (ext && ext.length <= 5) return ext;
  if (fileType === "application/pdf") return "PDF";
  if (fileType.includes("word")) return "DOCX";
  if (fileType.includes("spreadsheet") || fileType.includes("excel")) return "XLSX";
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return "PPTX";
  if (fileType.startsWith("text/")) return "TXT";
  if (fileType.startsWith("audio/")) return "AUDIO";
  if (fileType.startsWith("video/")) return "VIDEO";
  return "FILE";
}

function AttachmentPreviews({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return null;

  const images = attachments.filter((a) => a.fileType.startsWith("image/"));
  const files = attachments.filter((a) => !a.fileType.startsWith("image/"));

  return (
    <div className="flex items-center gap-2 flex-wrap mt-2">
      {images.map((a) => (
        <div key={a._id} className="w-14 h-14 rounded-md overflow-hidden bg-muted border shrink-0">
          <img src={a.fileUrl} alt={a.fileName} className="w-full h-full object-cover" />
        </div>
      ))}
      {files.map((a) => (
        <div key={a._id} className="flex items-center gap-1.5 text-xs bg-secondary text-secondary-foreground px-2.5 py-1.5 rounded-md">
          <FileIcon fileType={a.fileType} />
          <span className="font-medium">{getFileLabel(a.fileName, a.fileType)}</span>
        </div>
      ))}
    </div>
  );
}

function Inner({ content }: { content: Content }) {
  return (
    <article className="flex items-start py-5 sm:py-8 hover:bg-muted/30 transition-colors cursor-pointer group px-1">
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ContentTypeBadge type={content.type} />
          <span className="text-sm text-muted-foreground">
            · {format(new Date(content.createdAt), "MMM d, yyyy")}
          </span>
        </div>

        {content.description && (
          <p className="text-sm leading-relaxed line-clamp-3">
            {content.description}
          </p>
        )}

        <AttachmentPreviews attachments={content.attachmentIds} />
      </div>
    </article>
  );
}

export function ContentCard({ content, href }: Props) {
  if (href) {
    return <Link href={href}><Inner content={content} /></Link>;
  }
  return <Inner content={content} />;
}
