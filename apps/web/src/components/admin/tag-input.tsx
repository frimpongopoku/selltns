"use client";

import { useState } from "react";
import { X } from "lucide-react";

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

export function TagInput({
  tags,
  onChange,
  placeholder = "Add a tag…",
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (!tag) return;
    if (tag.length > MAX_TAG_LENGTH || tags.includes(tag) || tags.length >= MAX_TAGS) {
      setDraft("");
      return;
    }
    onChange([...tags, tag]);
    setDraft("");
  }

  function removeAt(index: number) {
    onChange(tags.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-transparent px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring/50">
      {tags.map((tag, i) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeAt(i)}
            aria-label={`Remove tag ${tag}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
            removeAt(tags.length - 1);
          }
        }}
        onBlur={() => commit(draft)}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="min-w-[6rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
