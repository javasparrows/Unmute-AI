"use client";

import { useRef, useCallback } from "react";
import { ParagraphOverlay } from "./paragraph-overlay";
import { cn } from "@/lib/utils";

interface EditorPanelProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onCursorChange: (cursorPosition: number) => void;
  onPaste?: (text: string) => void;
  activeParagraphIndex: number | null;
  showHighlight: boolean;
  placeholder?: string;
  isComposingRef: React.MutableRefObject<boolean>;
}

export function EditorPanel({
  label,
  value,
  onChange,
  onCursorChange,
  onPaste,
  activeParagraphIndex,
  showHighlight,
  placeholder,
  isComposingRef,
}: EditorPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (isComposingRef.current) return;
      onChange(e.target.value);
    },
    [onChange, isComposingRef],
  );

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, [isComposingRef]);

  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLTextAreaElement>) => {
      isComposingRef.current = false;
      onChange((e.target as HTMLTextAreaElement).value);
    },
    [onChange, isComposingRef],
  );

  const handleSelect = useCallback(() => {
    if (textareaRef.current) {
      onCursorChange(textareaRef.current.selectionStart);
    }
  }, [onCursorChange]);

  const handleClick = useCallback(() => {
    if (textareaRef.current) {
      onCursorChange(textareaRef.current.selectionStart);
    }
  }, [onCursorChange]);

  const handleKeyUp = useCallback(() => {
    if (textareaRef.current) {
      onCursorChange(textareaRef.current.selectionStart);
    }
  }, [onCursorChange]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (onPaste) {
        const pastedText = e.clipboardData.getData("text");
        if (pastedText.length > 20) {
          onPaste(pastedText);
        }
      }
    },
    [onPaste],
  );

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <div className="px-4 py-2 text-sm font-medium text-muted-foreground border-b border-border">
        {label}
      </div>
      <div className="relative flex-1">
        {showHighlight && (
          <ParagraphOverlay
            text={value}
            activeParagraphIndex={activeParagraphIndex}
            textareaRef={textareaRef}
          />
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onSelect={handleSelect}
          onClick={handleClick}
          onKeyUp={handleKeyUp}
          onPaste={handlePaste}
          placeholder={placeholder}
          className={cn(
            "w-full h-full resize-none p-4 font-sans text-base leading-relaxed",
            "focus:outline-none bg-transparent relative z-10",
            "placeholder:text-muted-foreground/50",
          )}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
