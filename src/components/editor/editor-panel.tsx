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
  activeSentenceIndex: number | null;
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
  activeSentenceIndex,
  sentenceRanges,
  placeholder,
  containerRef,
}: EditorPanelProps) {
  return (
    <div className="flex flex-col flex-1 min-w-0">
      <div className="px-4 py-2 text-sm font-medium text-muted-foreground border-b border-border">
        {label}
      </div>
      <TipTapEditor
        content={content}
        onTextChange={onTextChange}
        onSentenceChange={onSentenceChange}
        onBlur={onBlur}
        onPaste={onPaste}
        activeSentenceIndex={activeSentenceIndex}
        sentenceRanges={sentenceRanges}
        placeholder={placeholder}
        containerRef={containerRef}
      />
    </div>
  );
}
