"use client";

import { useCallback } from "react";
import { Mic, X, Check } from "lucide-react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInputButton({ onTranscript, disabled }: VoiceInputButtonProps) {
  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  const startRecording = useCallback(() => {
    if (!browserSupportsSpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true, language: "en-US" });
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

  if (listening) {
    return (
      <div className="flex items-center gap-1">
        <span className="relative flex h-2 w-2 mr-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={cancel}
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-green-600"
          onClick={confirm}
          title="Confirm"
        >
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
      className="h-7 w-7 text-muted-foreground hover:text-primary"
      onClick={startRecording}
      disabled={disabled}
      title="Speak to fill this field"
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
}
