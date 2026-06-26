import { Badge } from "@/components/ui/badge";
import { ContentType } from "@/types";
import {
  Lightbulb, Calendar, Users, Mic, Image, Video, FileText
} from "lucide-react";

const CONFIG: Record<ContentType, { label: string; icon: React.ElementType; variant: string }> = {
  THOUGHT: { label: "Thought", icon: Lightbulb, variant: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  EVENT: { label: "Event", icon: Calendar, variant: "bg-blue-100 text-blue-800 border-blue-200" },
  MEETING: { label: "Meeting", icon: Users, variant: "bg-purple-100 text-purple-800 border-purple-200" },
  VOICE_NOTE: { label: "Voice Note", icon: Mic, variant: "bg-pink-100 text-pink-800 border-pink-200" },
  PHOTO: { label: "Photo", icon: Image, variant: "bg-green-100 text-green-800 border-green-200" },
  VIDEO: { label: "Video", icon: Video, variant: "bg-red-100 text-red-800 border-red-200" },
  DOCUMENT: { label: "Document", icon: FileText, variant: "bg-gray-100 text-gray-800 border-gray-200" },
};

export function ContentTypeBadge({ type }: { type: ContentType }) {
  const { label, icon: Icon, variant } = CONFIG[type] || CONFIG.THOUGHT;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${variant}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

export function getContentTypeConfig(type: ContentType) {
  return CONFIG[type] || CONFIG.THOUGHT;
}
