const SENTENCE_END_REGEX = /([.。!?！？])/g;
const PARAGRAPH_SEPARATOR = "\n\n";

/**
 * Check if a token is a paragraph separator marker.
 */
export function isSeparator(s: string): boolean {
  return s === PARAGRAPH_SEPARATOR;
}

/**
 * Split text into sentence tokens and paragraph separators.
 * "Hello. World.\n\nOK." → ["Hello.", " World.", "\n\n", "OK."]
 *
 * Uses the same boundary logic as highlight-sentence.ts.
 */
export function splitSentences(text: string): string[] {
  if (!text) return [];

  const paragraphs = text.split(PARAGRAPH_SEPARATOR);
  const result: string[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    if (i > 0) {
      result.push(PARAGRAPH_SEPARATOR);
    }

    const para = paragraphs[i];
    if (!para) continue;

    let lastEnd = 0;
    SENTENCE_END_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = SENTENCE_END_REGEX.exec(para)) !== null) {
      const sentenceEnd = match.index + match[0].length;
      const sentence = para.slice(lastEnd, sentenceEnd);
      if (sentence) result.push(sentence);
      lastEnd = sentenceEnd;
    }

    // Remaining text after last boundary
    if (lastEnd < para.length) {
      result.push(para.slice(lastEnd));
    }
  }

  return result;
}

/**
 * Join sentence tokens back into a single string.
 */
export function joinSentences(sentences: string[]): string {
  return sentences.join("");
}

/**
 * Compute char-offset ranges for non-separator tokens.
 * Used for sentence highlighting in editors.
 */
export function computeSentenceRanges(
  tokens: string[],
): { from: number; to: number }[] {
  const ranges: { from: number; to: number }[] = [];
  let offset = 0;
  for (const token of tokens) {
    if (!isSeparator(token)) {
      ranges.push({ from: offset, to: offset + token.length });
    }
    offset += token.length;
  }
  return ranges;
}

/**
 * Compare two sentence lists and return indices of changed sentences.
 * Only compares non-separator tokens.
 */
export function detectChangedSentences(
  prev: string[],
  curr: string[],
): number[] {
  const changed: number[] = [];

  const prevSentences = prev.filter((s) => !isSeparator(s));
  const currSentences = curr.filter((s) => !isSeparator(s));

  for (let i = 0; i < currSentences.length; i++) {
    const p = prevSentences[i] ?? "";
    const c = currSentences[i];
    if (p !== c) {
      changed.push(i);
    }
  }

  return changed;
}
