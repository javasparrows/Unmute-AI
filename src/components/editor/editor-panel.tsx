"use client";

import { TipTapEditor } from "./tiptap-editor";
import type { SentenceRange } from "@/extensions/highlight-sentence";

interface EditorPanelProps {
  label: string;
  content: string;
  onTextChange: (text: string) => void;
  onSentenceChange: (index: number) => void;
  onBlur: () => void;
  onPaste?: (text: string) => void;
  activeSentenceIndices: number[] | null;
  sentenceRanges?: SentenceRange[];
  placeholder?: string;
  containerRef?: (node: HTMLDivElement | null) => void;
}

export function EditorPanel({
  label,
  content,
  onTextChange,
  onSentenceChange,
  onBlur,
  onPaste,
  activeSentenceIndices,
  sentenceRanges,
  placeholder,
  containerRef,
}: EditorPanelProps) {
  return (
    <div className="flex flex-col flex-1 min-w-0 bg-card">
      <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-accent-foreground bg-accent/60">
        {label}
      </div>
      <TipTapEditor
        content={content}
        onTextChange={onTextChange}
        onSentenceChange={onSentenceChange}
        onBlur={onBlur}
        onPaste={onPaste}
        activeSentenceIndices={activeSentenceIndices}
        sentenceRanges={sentenceRanges}
        placeholder={placeholder}
        containerRef={containerRef}
      />
    </div>
  );
}
