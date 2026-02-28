"use client";

import { useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { PlainTextOnly } from "@/extensions/plain-text-only";
import {
  HighlightSentence,
  highlightPluginKey,
  highlightRangesKey,
  getSentenceIndexAtPosition,
} from "@/extensions/highlight-sentence";
import type { SentenceRange } from "@/extensions/highlight-sentence";
import { textToDoc, textsAreDifferent } from "@/lib/tiptap-utils";

interface TipTapEditorProps {
  content: string;
  onTextChange: (text: string) => void;
  onSentenceChange: (index: number) => void;
  onBlur?: () => void;
  onPaste?: (text: string) => void;
  activeSentenceIndex: number | null;
  sentenceRanges?: SentenceRange[];
  placeholder?: string;
  containerRef?: (node: HTMLDivElement | null) => void;
}

function getBlockSeparatedText(editor: ReturnType<typeof useEditor>): string {
  if (!editor) return "";
  return editor.getText({ blockSeparator: "\n\n" });
}

export function TipTapEditor({
  content,
  onTextChange,
  onSentenceChange,
  onBlur,
  onPaste,
  activeSentenceIndex,
  sentenceRanges,
  placeholder,
  containerRef,
}: TipTapEditorProps) {
  const lastExternalTextRef = useRef(content);
  const isInternalChangeRef = useRef(false);
  const isSyncingContentRef = useRef(false);
  const prevHighlightRef = useRef<number | null>(null);
  const prevRangesRef = useRef<SentenceRange[] | undefined>(undefined);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [PlainTextOnly, HighlightSentence],
    content: textToDoc(content),
    editorProps: {
      attributes: {
        class: "tiptap",
        "data-placeholder": placeholder ?? "",
      },
      handlePaste(_view, event) {
        if (onPaste) {
          const pastedText = event.clipboardData?.getData("text") ?? "";
          if (pastedText.length > 20) {
            onPaste(pastedText);
          }
        }
        return false; // let TipTap handle the paste
      },
    },
    onUpdate({ editor }) {
      if (isSyncingContentRef.current) return;
      isInternalChangeRef.current = true;
      const text = getBlockSeparatedText(editor);
      lastExternalTextRef.current = text;
      onTextChange(text);
    },
    onSelectionUpdate({ editor }) {
      if (isSyncingContentRef.current) return;
      const { from } = editor.state.selection;
      const pluginState = highlightPluginKey.getState(editor.state) as
        | { externalRanges: SentenceRange[] | null }
        | undefined;
      const index = getSentenceIndexAtPosition(
        editor.state.doc,
        from,
        pluginState?.externalRanges,
      );
      onSentenceChange(index);
    },
    onBlur() {
      onBlur?.();
    },
  });

  // Sync external content changes (e.g. streaming translation)
  if (editor && !isInternalChangeRef.current) {
    if (textsAreDifferent(content, lastExternalTextRef.current)) {
      lastExternalTextRef.current = content;
      isSyncingContentRef.current = true;
      editor.commands.setContent(textToDoc(content));
      isSyncingContentRef.current = false;
    }
  }
  isInternalChangeRef.current = false;

  // Update external sentence ranges when they change
  if (editor && sentenceRanges !== prevRangesRef.current) {
    prevRangesRef.current = sentenceRanges;
    const editorRef = editor;
    const ranges = sentenceRanges ?? null;
    setTimeout(() => {
      if (editorRef.isDestroyed) return;
      const tr = editorRef.state.tr.setMeta(highlightRangesKey, ranges);
      editorRef.view.dispatch(tr);
    }, 0);
  }

  // Update highlight decoration when activeSentenceIndex changes
  // Deferred via setTimeout to avoid setState-during-render
  if (editor && activeSentenceIndex !== prevHighlightRef.current) {
    prevHighlightRef.current = activeSentenceIndex;
    const editorRef = editor;
    setTimeout(() => {
      if (editorRef.isDestroyed) return;
      const tr = editorRef.state.tr.setMeta(
        highlightPluginKey,
        activeSentenceIndex,
      );
      editorRef.view.dispatch(tr);
    }, 0);
  }

  return (
    <div ref={containerRef} className="flex-1 min-h-0 overflow-auto">
      <EditorContent editor={editor} className="h-full" />
    </div>
  );
}
