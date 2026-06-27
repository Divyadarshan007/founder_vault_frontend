"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { Mic, Check, Plus, Send, X, Link as LinkIcon, Paperclip, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { transcribeAudio } from "@/services/transcribe.service";
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

function preferredMime() {
  for (const mime of ["audio/webm", "audio/mp4", "audio/ogg"]) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function ChatContentModal({ open, onClose, onSuccess, initialContent }: Props) {
  const [text, setText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [attachedLinks, setAttachedLinks] = useState<string[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mobile Groq fallback state
  const [fallbackState, setFallbackState] = useState<"idle" | "recording" | "processing">("idle");
  const [fallbackSeconds, setFallbackSeconds] = useState(0);

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
  const isMobile = useIsMobile();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Mobile MediaRecorder refs
  const fallbackRecorderRef = useRef<MediaRecorder | null>(null);
  const fallbackChunksRef = useRef<Blob[]>([]);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      cancelFallbackRecording();
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

  const cancelFallbackRecording = useCallback(() => {
    if (fallbackTimerRef.current) { clearInterval(fallbackTimerRef.current); fallbackTimerRef.current = null; }
    const rec = fallbackRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.ondataavailable = null;
      rec.onstop = null;
      rec.stop();
      rec.stream?.getTracks().forEach((t) => t.stop());
    }
    fallbackRecorderRef.current = null;
    setFallbackState("idle");
    setFallbackSeconds(0);
  }, []);

  const handleClose = useCallback(() => {
    SpeechRecognition.stopListening();
    resetTranscript();
    stopWaveform();
    cancelFallbackRecording();
    reset();
    onClose();
  }, [reset, onClose, stopWaveform, resetTranscript, cancelFallbackRecording]);

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

  // Desktop: Web Speech API (real-time preview)
  const startRecording = useCallback(() => {
    if (!browserSupportsSpeechRecognition) {
      toast.info("Voice input isn't supported in this browser. Tap the mic key on your keyboard to dictate.");
      return;
    }
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true, language: navigator.language || "en-US" });
    startWaveform();
  }, [browserSupportsSpeechRecognition, resetTranscript, startWaveform]);

  const confirmRecording = useCallback(() => {
    SpeechRecognition.stopListening();
    stopWaveform();
    const captured = transcript.trim();
    resetTranscript();
    if (captured) setText((prev) => (prev ? `${prev} ${captured}` : captured));
  }, [transcript, resetTranscript, stopWaveform]);

  const cancelRecording = useCallback(() => {
    SpeechRecognition.stopListening();
    resetTranscript();
    stopWaveform();
  }, [resetTranscript, stopWaveform]);

  // Mobile: MediaRecorder → Groq Whisper (accurate transcription)
  const startFallbackRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = preferredMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      fallbackRecorderRef.current = recorder;
      fallbackChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) fallbackChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blobMime = recorder.mimeType || mime || "audio/webm";
        const ext = blobMime.includes("mp4") ? "m4a" : blobMime.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(fallbackChunksRef.current, { type: blobMime });
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blobMime });

        setFallbackState("processing");
        if (fallbackTimerRef.current) { clearInterval(fallbackTimerRef.current); fallbackTimerRef.current = null; }

        try {
          const transcribed = await transcribeAudio(file);
          if (transcribed.trim()) {
            setText((prev) => (prev ? `${prev} ${transcribed.trim()}` : transcribed.trim()));
          } else {
            toast.info("No speech detected — please try again.");
          }
        } catch {
          toast.error("Transcription failed. Check your internet connection and try again.");
        } finally {
          setFallbackState("idle");
          setFallbackSeconds(0);
        }
      };

      recorder.start();
      setFallbackState("recording");
      setFallbackSeconds(0);
      fallbackTimerRef.current = setInterval(() => setFallbackSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Microphone access denied. Allow mic in your browser settings.");
    }
  }, []);

  const stopFallbackRecording = useCallback(() => {
    if (fallbackTimerRef.current) { clearInterval(fallbackTimerRef.current); fallbackTimerRef.current = null; }
    fallbackRecorderRef.current?.stop();
  }, []);

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
            className="min-h-27.5 max-h-65 overflow-y-auto resize-none border-0 p-3 text-sm focus-visible:ring-0 shadow-none bg-transparent"
          />
        </div>

        {/* Desktop: waveform bar while Web Speech API is listening */}
        {listening && !isMobile && (
          <div className="px-4 pb-4 flex items-center gap-2 border-t pt-3">
            <canvas ref={canvasRef} className="flex-1 h-8 text-foreground" />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-destructive" onClick={cancelRecording} title="Cancel">
              <X className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-green-600" onClick={confirmRecording} title="Confirm">
              <Check className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Mobile: recording bar (MediaRecorder → Groq) */}
        {isMobile && fallbackState === "recording" && (
          <div className="px-4 pb-4 flex items-center gap-2 border-t pt-3">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-sm font-medium tabular-nums text-muted-foreground flex-1">
              {formatTime(fallbackSeconds)} — Recording…
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-destructive" onClick={cancelFallbackRecording} title="Cancel">
              <X className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-green-600" onClick={stopFallbackRecording} title="Done — transcribe">
              <Check className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Mobile: transcribing spinner */}
        {isMobile && fallbackState === "processing" && (
          <div className="px-4 pb-4 flex items-center gap-2 border-t pt-3">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">Transcribing…</span>
          </div>
        )}

        {/* Action bar — hidden while any recording is active */}
        {!listening && fallbackState === "idle" && (
          <div className="px-5 pb-5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" title="Attach">
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
                className="h-9 w-9 rounded-full"
                onClick={isMobile ? startFallbackRecording : startRecording}
                title="Voice input"
              >
                <Mic className="w-4 h-4" />
              </Button>
            </div>

            <Button onClick={handleSend} disabled={!canSend} size="sm" className="h-9 px-4 gap-1.5">
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
