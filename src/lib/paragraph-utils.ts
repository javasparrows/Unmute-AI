/**
 * Split text into paragraphs using double newlines as delimiter.
 */
export function splitParagraphs(text: string): string[] {
  if (!text.trim()) return [];
  return text.split(/\n\n+/);
}

/**
 * Given a cursor position (selectionStart) in a textarea,
 * determine which paragraph index the cursor is in.
 */
export function getCursorParagraphIndex(
  text: string,
  cursorPosition: number,
): number {
  const upToCursor = text.slice(0, cursorPosition);
  const paragraphs = upToCursor.split(/\n\n+/);
  return Math.max(0, paragraphs.length - 1);
}

/**
 * Get the character range (start, end) of a paragraph by index.
 */
export function getParagraphRange(
  text: string,
  paragraphIndex: number,
): { start: number; end: number } | null {
  const paragraphs = splitParagraphs(text);
  if (paragraphIndex < 0 || paragraphIndex >= paragraphs.length) return null;

  let start = 0;
  for (let i = 0; i < paragraphIndex; i++) {
    start += paragraphs[i].length;
    // Skip past the double newline separator
    const remaining = text.slice(start);
    const match = remaining.match(/^\n\n+/);
    if (match) {
      start += match[0].length;
    }
  }

  return {
    start,
    end: start + paragraphs[paragraphIndex].length,
  };
}
