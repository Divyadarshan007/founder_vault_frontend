"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ tags, onChange, placeholder = "Add tags…" }: Props) {
  const [input, setInput] = useState("");

  function addTag(value: string) {
    const tag = value.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-background min-h-10 items-center">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground text-sm px-2 py-0.5 rounded-full"
        >
          #{tag}
          <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        className="flex-1 min-w-24 outline-none bg-transparent text-sm placeholder:text-muted-foreground"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => addTag(input)}
        placeholder={tags.length === 0 ? placeholder : ""}
      />
    </div>
  );
}
