"use client";

import { useRef, useState, useCallback } from "react";
import { splitParagraphs } from "@/lib/paragraph-utils";

interface ParagraphOverlayProps {
  text: string;
  activeParagraphIndex: number | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function ParagraphOverlay({
  text,
  activeParagraphIndex,
  textareaRef,
}: ParagraphOverlayProps) {
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const syncScroll = useCallback(() => {
    if (textareaRef.current) {
      setScrollTop(textareaRef.current.scrollTop);
    }
  }, [textareaRef]);

  // Attach scroll listener to textarea
  const textarea = textareaRef.current;
  if (textarea) {
    textarea.onscroll = syncScroll;
  }

  const paragraphs = splitParagraphs(text);

  // Build the mirrored content with highlight
  const parts: { text: string; isHighlighted: boolean }[] = [];
  const rawParagraphs = text.split(/(\n\n+)/);

  let paragraphIdx = 0;
  for (const part of rawParagraphs) {
    if (/^\n\n+$/.test(part)) {
      parts.push({ text: part, isHighlighted: false });
    } else {
      parts.push({
        text: part,
        isHighlighted: paragraphIdx === activeParagraphIndex,
      });
      paragraphIdx++;
    }
  }

  // Add trailing content if text ends with newlines
  if (!text) {
    parts.push({ text: "\u00A0", isHighlighted: false });
  }

  return (
    <div
      ref={mirrorRef}
      className="absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words font-sans text-base leading-relaxed p-4"
      style={{
        transform: `translateY(-${scrollTop}px)`,
        // Match textarea typography exactly
        fontFamily: "inherit",
        fontSize: "inherit",
        lineHeight: "inherit",
        letterSpacing: "inherit",
        wordSpacing: "inherit",
      }}
      aria-hidden
    >
      {parts.map((part, i) => (
        <span
          key={i}
          className={
            part.isHighlighted
              ? "bg-highlight/50 rounded-sm"
              : "bg-transparent"
          }
        >
          {part.text || "\u00A0"}
        </span>
      ))}
    </div>
  );
}
