import type { JSONContent } from "@tiptap/react";

/**
 * Convert plain text (paragraphs separated by \n\n) to ProseMirror JSON document.
 */
export function textToDoc(text: string): JSONContent {
  const paragraphs = text.split(/\n\n/);
  return {
    type: "doc",
    content: paragraphs.map((p) => ({
      type: "paragraph",
      content: p ? [{ type: "text", text: p }] : [],
    })),
  };
}

/**
 * Compare two plain texts, ignoring trailing whitespace differences.
 */
export function textsAreDifferent(a: string, b: string): boolean {
  return a.trimEnd() !== b.trimEnd();
}
