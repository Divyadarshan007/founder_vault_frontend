"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { Mic, Check, Plus, Send, X, Link as LinkIcon, Paperclip } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { createContent, updateContent } from "@/services/content.service";
import { uploadFiles } from "@/services/upload.service";
import { Content, ContentType, Attachment } from "@/types";

interface AttachedFile {
  id: string;
  file: File;
  preview?: string;
  isImage: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialContent?: Content;
}

export function ChatContentModal({ open, onClose, onSuccess, initialContent }: Props) {
  const [text, setText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [attachedLinks, setAttachedLinks] = useState<string[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
  const isMobile = useIsMobile();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Init or teardown when modal opens/closes
  useEffect(() => {
    if (open) {
      if (initialContent) {
        setText(initialContent.description);
        setExistingAttachments(initialContent.attachmentIds);
      }
    } else {
      SpeechRecognition.stopListening();
      resetTranscript();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (showLinkInput) {
      setTimeout(() => linkInputRef.current?.focus(), 50);
    }
  }, [showLinkInput]);

  useEffect(() => {
    return () => {
      attachedFiles.forEach((a) => {
        if (a.preview) URL.revokeObjectURL(a.preview);
      });
    };
  }, []);

  const reset = useCallback(() => {
    setText("");
    setAttachedFiles((prev) => {
      prev.forEach((a) => {
        if (a.preview) URL.revokeObjectURL(a.preview);
      });
      return [];
    });
    setAttachedLinks([]);
    setExistingAttachments([]);
    setShowLinkInput(false);
    setLinkValue("");
  }, []);

  const stopWaveform = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    SpeechRecognition.stopListening();
    resetTranscript();
    stopWaveform();
    reset();
    onClose();
  }, [reset, onClose, stopWaveform, resetTranscript]);

  const startWaveform = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;
      audioCtx.createMediaStreamSource(stream).connect(analyser);

      const POINT_COUNT = 60;
      const points: { x: number; y: number }[] = Array(POINT_COUNT).fill({ x: 0, y: 0 });

      const draw = () => {
        const canvas = canvasRef.current;
        const an = analyserRef.current;
        if (!canvas || !an) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
          canvas.width = canvas.offsetWidth;
          canvas.height = canvas.offsetHeight;
        }

        const data = new Uint8Array(an.frequencyBinCount);
        an.getByteTimeDomainData(data);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const step = Math.floor(data.length / POINT_COUNT);
        const cy = canvas.height / 2;
        const color = getComputedStyle(canvas).color;

        // build smoothed points
        for (let i = 0; i < POINT_COUNT; i++) {
          // average 3 neighbouring samples to reduce jitter
          const s0 = data[Math.max(0, i * step - 1)] / 128.0 - 1;
          const s1 = data[i * step] / 128.0 - 1;
          const s2 = data[Math.min(data.length - 1, i * step + 1)] / 128.0 - 1;
          const v = (s0 + s1 + s2) / 3;
          points[i] = {
            x: (i / (POINT_COUNT - 1)) * canvas.width,
            y: cy + v * cy * 1.8,          // 1.8 = high sensitivity
          };
        }

        // draw dots
        ctx.fillStyle = color;
        for (const p of points) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // connect dots with a smooth curve
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.35;
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < POINT_COUNT - 1; i++) {
          const mx = (points[i].x + points[i + 1].x) / 2;
          const my = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        animFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch {
      // mic access denied — recording still works, just no waveform
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!browserSupportsSpeechRecognition) {
      toast.info("Voice input isn't supported in this browser. Tap the mic key on your keyboard to dictate.");
      return;
    }
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true, language: "en-US", interimResults: true });
    // Skip waveform on mobile — a second getUserMedia call can interfere with the
    // browser's internal mic access used by the Speech Recognition API.
    if (!isMobile) startWaveform();
  }, [browserSupportsSpeechRecognition, resetTranscript, startWaveform, isMobile]);

  const confirmRecording = useCallback(() => {
    SpeechRecognition.stopListening();
    stopWaveform();
    const captured = transcript.trim();
    resetTranscript();
    if (captured) {
      setText((prev) => (prev ? `${prev} ${captured}` : captured));
    }
  }, [transcript, resetTranscript, stopWaveform]);

  const cancelRecording = useCallback(() => {
    SpeechRecognition.stopListening();
    resetTranscript();
    stopWaveform();
  }, [resetTranscript, stopWaveform]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const totalFiles = existingAttachments.length + attachedFiles.length + files.length;
    if (totalFiles > 5) {
      toast.error("Maximum 5 files allowed");
      e.target.value = "";
      return;
    }

    const newAttachments: AttachedFile[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      isImage: file.type.startsWith("image/"),
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
    }));

    setAttachedFiles((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setAttachedFiles((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((a) => a.id !== id);
    });
  };

  const removeExisting = (id: string) => {
    setExistingAttachments((prev) => prev.filter((a) => a._id !== id));
  };

  const addLink = () => {
    const raw = linkValue.trim();
    if (!raw) return;
    const url = raw.startsWith("http") ? raw : `https://${raw}`;
    try {
      new URL(url);
      setAttachedLinks((prev) => [...prev, url]);
      setLinkValue("");
      setShowLinkInput(false);
    } catch {
      toast.error("Please enter a valid URL");
    }
  };

  const removeLink = (index: number) => {
    setAttachedLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const hasAttachments = attachedFiles.length > 0 || attachedLinks.length > 0 || existingAttachments.length > 0;
  const canSend = (text.trim() || hasAttachments) && !isSubmitting;
  const isEditMode = !!initialContent;

  const handleSend = async () => {
    if (!canSend) return;

    setIsSubmitting(true);
    try {
      let newAttachmentIds: string[] = [];
      if (attachedFiles.length > 0) {
        const uploaded = await uploadFiles(
          attachedFiles.map((a) => a.file),
          initialContent?._id
        );
        newAttachmentIds = uploaded.map((u) => u.attachmentId);
      }

      const linksText = attachedLinks.join("\n");
      const description = [text.trim(), linksText].filter(Boolean).join("\n\n");

      if (isEditMode) {
        await updateContent(initialContent._id, {
          description,
          tags: initialContent.tags,
          attachmentIds: [
            ...existingAttachments.map((a) => a._id),
            ...newAttachmentIds,
          ],
        });
        toast.success("Content updated!");
      } else {
        const title =
          text.trim().slice(0, 80) ||
          attachedLinks[0] ||
          attachedFiles[0]?.file.name ||
          "Untitled";

        const hasImages = attachedFiles.some((a) => a.isImage);
        const hasDocs = attachedFiles.some((a) => !a.isImage);
        let type: ContentType = "THOUGHT";
        if (hasImages && !hasDocs && !text.trim()) type = "PHOTO";
        else if (hasDocs && !text.trim()) type = "DOCUMENT";

        await createContent({ title, description, type, attachmentIds: newAttachmentIds });
        toast.success("Content saved!");
      }

      reset();
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to save content. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b">
          <DialogTitle className="text-base font-semibold">
            {isEditMode ? "Edit Content" : "Add Content"}
          </DialogTitle>
        </DialogHeader>

        {/* Preview zone */}
        {hasAttachments && (
          <div className="px-5 py-3 border-b flex flex-wrap gap-2 bg-muted/30">
            {/* Existing server attachments */}
            {existingAttachments.map((a) =>
              a.fileType.startsWith("image/") ? (
                <div
                  key={a._id}
                  className="relative group w-20 h-20 rounded-lg overflow-hidden border bg-muted"
                >
                  <img
                    src={a.fileUrl}
                    alt={a.fileName}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeExisting(a._id)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  key={a._id}
                  className="flex items-center gap-1.5 bg-background border rounded-full px-3 py-1.5 text-sm max-w-52"
                >
                  <Paperclip className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{a.fileName}</span>
                  <button
                    onClick={() => removeExisting(a._id)}
                    className="ml-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            )}

            {/* Newly added local files */}
            {attachedFiles.map((a) =>
              a.isImage ? (
                <div
                  key={a.id}
                  className="relative group w-20 h-20 rounded-lg overflow-hidden border bg-muted"
                >
                  <img
                    src={a.preview}
                    alt={a.file.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeFile(a.id)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  key={a.id}
                  className="flex items-center gap-1.5 bg-background border rounded-full px-3 py-1.5 text-sm max-w-52"
                >
                  <Paperclip className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{a.file.name}</span>
                  <button
                    onClick={() => removeFile(a.id)}
                    className="ml-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            )}

            {/* Links */}
            {attachedLinks.map((link, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 bg-background border rounded-full px-3 py-1.5 text-sm max-w-56"
              >
                <LinkIcon className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                <span className="truncate text-blue-600 dark:text-blue-400">
                  {link}
                </span>
                <button
                  onClick={() => removeLink(i)}
                  className="ml-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Link input row */}
        {showLinkInput && (
          <div className="px-5 py-3 border-b flex gap-2 bg-muted/20">
            <Input
              ref={linkInputRef}
              placeholder="https://..."
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addLink();
                if (e.key === "Escape") {
                  setShowLinkInput(false);
                  setLinkValue("");
                }
              }}
              className="flex-1 h-8 text-sm"
            />
            <Button size="sm" onClick={addLink} className="h-8 px-3">
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowLinkInput(false);
                setLinkValue("");
              }}
              className="h-8 w-8 p-0"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Text input area */}
        <div className="px-5 pt-4 pb-2">
          <Textarea
            placeholder="Type or speak your content…"
            value={listening ? (text ? `${text} ${transcript}` : transcript) : text}
            onChange={(e) => !listening && setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
            }}
            className="min-h-27.5 resize-none border-0 p-3 text-sm focus-visible:ring-0 shadow-none bg-transparent"
          />
        </div>

        {/* Waveform bar — shown while recording */}
        {listening && (
          <div className="px-4 pb-4 flex items-center gap-2 border-t pt-3">
            <canvas
              ref={canvasRef}
              className="flex-1 h-8 text-foreground"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
              onClick={cancelRecording}
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-green-600"
              onClick={confirmRecording}
              title="Confirm"
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Action bar — hidden while recording */}
        {!listening && (
          <div className="px-5 pb-5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    title="Attach"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="w-4 h-4" />
                    Photo / File
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowLinkInput(true)}>
                    <LinkIcon className="w-4 h-4" />
                    Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-full ${!browserSupportsSpeechRecognition ? "opacity-40" : ""}`}
                onClick={startRecording}
                title={browserSupportsSpeechRecognition ? "Voice input" : "Voice input not supported — use your keyboard mic"}
              >
                <Mic className="w-4 h-4" />
              </Button>
            </div>

            <Button
              onClick={handleSend}
              disabled={!canSend}
              size="sm"
              className="h-9 px-4 gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting
                ? isEditMode ? "Updating…" : "Saving…"
                : isEditMode ? "Update" : "Send"}
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept="image/*,.pdf,.docx,.doc,.txt"
          onChange={handleFileSelect}
        />
      </DialogContent>
    </Dialog>
  );
}
