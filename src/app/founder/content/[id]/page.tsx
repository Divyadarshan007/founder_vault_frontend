"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Edit2, FileText, Music, Video, File, Download } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContentTypeBadge } from "@/components/ContentTypeBadge";
import { ChatContentModal } from "@/components/ChatContentModal";
import { getContent, deleteContent } from "@/services/content.service";
import { useAuthStore } from "@/store/auth.store";
import { Content } from "@/types";

function downloadFile(fileUrl: string, fileName: string) {
  const a = document.createElement("a");
  a.href = fileUrl;
  a.download = fileName;
  a.target = "_blank";
  a.click();
}

function AttachmentIcon({ fileType }: { fileType: string }) {
  if (fileType.startsWith("audio/")) return <Music className="w-4 h-4 shrink-0" />;
  if (fileType.startsWith("video/")) return <Video className="w-4 h-4 shrink-0" />;
  if (fileType === "application/pdf")
    return <span className="text-[10px] font-bold leading-none bg-red-100 text-red-600 px-1.5 py-1 rounded shrink-0">PDF</span>;
  if (fileType.includes("wordprocessingml") || fileType.includes("msword"))
    return <span className="text-[10px] font-bold leading-none bg-blue-100 text-blue-600 px-1.5 py-1 rounded shrink-0">DOC</span>;
  if (fileType.includes("document") || fileType.includes("text"))
    return <FileText className="w-4 h-4 shrink-0" />;
  return <File className="w-4 h-4 shrink-0" />;
}

export default function ContentDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const initials =
    user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "U";

  useEffect(() => {
    getContent(id)
      .then(setContent)
      .catch(() => toast.error("Content not found"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteContent(id);
      toast.success("Content deleted");
      router.push("/founder/content");
    } catch {
      toast.error("Failed to delete content");
      setDeleting(false);
    }
  }

  async function handleEditSuccess() {
    try {
      const updated = await getContent(id);
      setContent(updated);
    } catch {
      // non-critical — page still shows stale data
    }
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col max-w-2xl mx-auto gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-md" />
          <Skeleton className="w-20 h-6 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-24 h-3" />
          </div>
        </div>
        <Skeleton className="w-3/4 h-8" />
        <Skeleton className="w-full h-40" />
      </div>
    );
  }

  if (!content) return null;

  const images = content.attachmentIds.filter((a) => a.fileType.startsWith("image/"));
  const nonImages = content.attachmentIds.filter((a) => !a.fileType.startsWith("image/"));

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto">
      {/* Top bar */}
      <div className="flex-none flex items-center gap-2 pb-6">
        <Link href="/founder/content">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <ContentTypeBadge type={content.type} />
        <div className="flex-1" />
        <Button variant="outline" size="icon" onClick={() => setEditOpen(true)}>
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button variant="destructive" size="icon" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 space-y-5">
        {/* Byline */}
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.profileImage} />
            <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold leading-tight">{user?.name}</p>
            <p className="text-xs text-muted-foreground">
              {user?.designation ? `${user.designation} · ` : ""}
              {format(new Date(content.createdAt), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* Title */}
        {content.title && <h1 className="text-2xl font-bold leading-snug">{content.title}</h1>}

        {/* Description */}
        <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground/90">
          {content.description}
        </p>

      </div>

      {/* Fixed-bottom attachments — only rendered when present */}
      {content.attachmentIds.length > 0 && (
        <div className="flex-none border-t pt-4 mt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Attachments
          </p>
          <div className="flex flex-wrap gap-2">
            {images.map((a) => (
              <div key={a._id} className="flex items-center gap-1.5 text-xs bg-secondary text-secondary-foreground px-2 py-1.5 rounded-lg max-w-56">
                <a
                  href={a.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded overflow-hidden bg-muted border shrink-0 block hover:opacity-80 transition-opacity"
                >
                  <img src={a.fileUrl} alt={a.fileName} className="w-full h-full object-cover" />
                </a>
                <span className="truncate flex-1">{a.fileName}</span>
                <button
                  type="button"
                  onClick={() => downloadFile(a.fileUrl, a.fileName)}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {nonImages.map((a) => (
              <button
                key={a._id}
                type="button"
                onClick={() => downloadFile(a.fileUrl, a.fileName)}
                className="flex items-center gap-1.5 text-xs bg-secondary text-secondary-foreground px-3 py-2 rounded-lg hover:bg-secondary/80 transition-colors max-w-56"
              >
                <AttachmentIcon fileType={a.fileType} />
                <span className="truncate flex-1">{a.fileName}</span>
                <Download className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Edit modal — same popup, pre-filled */}
      <ChatContentModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={handleEditSuccess}
        initialContent={content}
      />

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Content</DialogTitle>
            <DialogDescription>
              This will permanently delete this content and all its attachments. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
