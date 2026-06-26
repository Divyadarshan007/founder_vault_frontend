"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onRecorded: (file: File | null) => void;
  disabled?: boolean;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function preferredMime() {
  for (const mime of ["audio/webm", "audio/mp4", "audio/ogg"]) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

function mimeToExt(mime: string) {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

export function AudioRecorder({ onRecorded, disabled }: Props) {
  const [state, setState] = useState<"idle" | "recording" | "done">("idle");
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = preferredMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const ext = mimeToExt(recorder.mimeType);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type: recorder.mimeType });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPreviewFile(file);
        setState("done");
        onRecorded(file);
      };

      recorder.start();
      setState("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      alert("Microphone access denied or not supported in this browser.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function discard() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
    setPlaying(false);
    setSeconds(0);
    setState("idle");
    onRecorded(null);
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
      {state === "idle" && (
        <Button
          type="button"
          variant="outline"
          onClick={start}
          disabled={disabled}
          className="w-full gap-2"
        >
          <Mic className="w-4 h-4" />
          Record Audio
        </Button>
      )}

      {state === "recording" && (
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse shrink-0" />
          <span className="text-sm font-medium tabular-nums">{formatTime(seconds)}</span>
          <span className="text-sm text-muted-foreground flex-1">Recording…</span>
          <Button type="button" variant="destructive" size="sm" onClick={stop} className="gap-1">
            <Square className="w-3 h-3" /> Stop
          </Button>
        </div>
      )}

      {state === "done" && previewUrl && previewFile && (
        <div className="flex items-center gap-3">
          {/* hidden audio element for playback */}
          <audio
            ref={audioRef}
            src={previewUrl}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
          <Button type="button" variant="outline" size="icon" onClick={togglePlay} className="shrink-0">
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{previewFile.name}</p>
            <p className="text-xs text-muted-foreground">{formatTime(seconds)} · recorded</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={discard}
            className="text-muted-foreground hover:text-destructive shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
