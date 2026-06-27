"use client";

import { useCallback, useRef, useState } from "react";
import { Mic, X, Check, Loader2 } from "lucide-react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { transcribeAudio } from "@/services/transcribe.service";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

function preferredMime() {
  for (const mime of ["audio/webm", "audio/mp4", "audio/ogg"]) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

export function VoiceInputButton({ onTranscript, disabled }: VoiceInputButtonProps) {
  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
  const isMobile = useIsMobile();

  const [fallbackState, setFallbackState] = useState<"idle" | "recording" | "processing">("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Desktop: Web Speech API
  const startRecording = useCallback(() => {
    if (!browserSupportsSpeechRecognition) {
      toast.info("Voice input isn't supported in this browser. Tap the mic key on your keyboard to dictate.");
      return;
    }
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true, language: navigator.language || "en-US" });
  }, [browserSupportsSpeechRecognition, resetTranscript]);

  const confirm = useCallback(() => {
    SpeechRecognition.stopListening();
    const captured = transcript.trim();
    resetTranscript();
    if (captured) onTranscript(captured);
  }, [transcript, resetTranscript, onTranscript]);

  const cancel = useCallback(() => {
    SpeechRecognition.stopListening();
    resetTranscript();
  }, [resetTranscript]);

  // Mobile: MediaRecorder → Groq Whisper
  const startFallback = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = preferredMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blobMime = recorder.mimeType || mime || "audio/webm";
        const ext = blobMime.includes("mp4") ? "m4a" : blobMime.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(chunksRef.current, { type: blobMime });
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blobMime });

        setFallbackState("processing");
        try {
          const text = await transcribeAudio(file);
          if (text.trim()) onTranscript(text.trim());
          else toast.info("No speech detected — please try again.");
        } catch {
          toast.error("Transcription failed. Check your connection and try again.");
        } finally {
          setFallbackState("idle");
        }
      };

      recorder.start();
      setFallbackState("recording");
    } catch {
      toast.error("Microphone access denied. Allow mic in your browser settings.");
    }
  }, [onTranscript]);

  const stopFallback = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const cancelFallback = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.ondataavailable = null;
      rec.onstop = null;
      rec.stop();
      rec.stream?.getTracks().forEach((t) => t.stop());
    }
    recorderRef.current = null;
    setFallbackState("idle");
  }, []);

  // --- Mobile UI ---
  if (isMobile) {
    if (fallbackState === "processing") {
      return (
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled>
          <Loader2 className="h-4 w-4 animate-spin" />
        </Button>
      );
    }
    if (fallbackState === "recording") {
      return (
        <div className="flex items-center gap-1">
          <span className="relative flex h-2 w-2 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={cancelFallback} title="Cancel">
            <X className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-green-600" onClick={stopFallback} title="Done">
            <Check className="h-4 w-4" />
          </Button>
        </div>
      );
    }
    return (
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={startFallback} disabled={disabled} title="Tap to record voice input">
        <Mic className="h-4 w-4" />
      </Button>
    );
  }

  // --- Desktop UI (Web Speech API) ---
  if (listening) {
    return (
      <div className="flex items-center gap-1">
        <span className="relative flex h-2 w-2 mr-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={cancel} title="Cancel">
          <X className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-green-600" onClick={confirm} title="Confirm">
          <Check className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`h-7 w-7 text-muted-foreground hover:text-primary ${!browserSupportsSpeechRecognition ? "opacity-40" : ""}`}
      onClick={startRecording}
      disabled={disabled}
      title={browserSupportsSpeechRecognition ? "Speak to fill this field" : "Voice input not supported — use your keyboard mic"}
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
}
