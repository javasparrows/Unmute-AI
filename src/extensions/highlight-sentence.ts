import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const highlightPluginKey = new PluginKey("highlightSentence");
export const highlightRangesKey = new PluginKey("highlightRanges");

export interface SentenceRange {
  from: number;
  to: number;
}

interface HighlightState {
  indices: number[] | null;
  externalRanges: SentenceRange[] | null;
  decorations: DecorationSet;
}

const SENTENCE_END_REGEX = /[.。!?！？]\s*/g;

function getSentenceRanges(doc: ProseMirrorNode): SentenceRange[] {
  const ranges: SentenceRange[] = [];

  doc.forEach((node, offset) => {
    if (node.type.name !== "paragraph") return;

    const text = node.textContent;
    if (!text.length) return;

    const basePos = offset + 1;
    let lastEnd = 0;

    SENTENCE_END_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = SENTENCE_END_REGEX.exec(text)) !== null) {
      const sentenceEnd = match.index + match[0].length;
      ranges.push({ from: basePos + lastEnd, to: basePos + sentenceEnd });
      lastEnd = sentenceEnd;
    }

    // Remaining text after the last boundary, or the entire paragraph if no boundary found
    if (lastEnd < text.length) {
      ranges.push({ from: basePos + lastEnd, to: basePos + text.length });
    }
  });

  return ranges;
}

export function getSentenceIndexAtPosition(
  doc: ProseMirrorNode,
  pos: number,
  externalRanges?: SentenceRange[] | null,
): number {
  if (externalRanges && externalRanges.length > 0) {
    // External ranges are char-offset based; convert to PM positions (+1)
    for (let i = externalRanges.length - 1; i >= 0; i--) {
      if (pos >= externalRanges[i].from + 1) {
        return i;
      }
    }
    return 0;
  }

  const ranges = getSentenceRanges(doc);
  for (let i = ranges.length - 1; i >= 0; i--) {
    if (pos >= ranges[i].from) {
      return i;
    }
  }
  return 0;
}

function buildDecorations(
  doc: ProseMirrorNode,
  sentenceIndices: number[],
  className: string,
  externalRanges: SentenceRange[] | null,
): DecorationSet {
  const decorations: Decoration[] = [];

  if (externalRanges) {
    // Use external char-offset ranges, converting to PM positions (+1 offset)
    const maxPos = doc.content.size;
    for (const idx of sentenceIndices) {
      if (idx < 0 || idx >= externalRanges.length) continue;
      const range = externalRanges[idx];
      const from = range.from + 1;
      const to = range.to + 1;
      if (from >= maxPos) continue;
      decorations.push(
        Decoration.inline(from, Math.min(to, maxPos), { class: className }),
      );
    }
  } else {
    // Fallback: regex-based detection (for left/source editor)
    const ranges = getSentenceRanges(doc);
    for (const idx of sentenceIndices) {
      if (idx < 0 || idx >= ranges.length) continue;
      const range = ranges[idx];
      decorations.push(
        Decoration.inline(range.from, range.to, { class: className }),
      );
    }
  }

  if (decorations.length === 0) return DecorationSet.empty;
  return DecorationSet.create(doc, decorations);
}

export interface HighlightSentenceOptions {
  className: string;
}

/**
 * ProseMirror extension for sentence-level highlighting via Decoration.inline().
 *
 * To update the highlight, dispatch a transaction with:
 *   tr.setMeta(highlightPluginKey, [0, 1])      // highlight multiple sentences
 *   tr.setMeta(highlightPluginKey, null)          // clear highlight
 */
export const HighlightSentence = Extension.create<HighlightSentenceOptions>({
  name: "highlightSentence",

  addOptions() {
    return {
      className: "sentence-highlight",
    };
  },

  addProseMirrorPlugins() {
    const className = this.options.className;
    const emptyState: HighlightState = {
      indices: null,
      externalRanges: null,
      decorations: DecorationSet.empty,
    };

    return [
      new Plugin({
        key: highlightPluginKey,
        state: {
          init(): HighlightState {
            return emptyState;
          },
          apply(tr, prev, _oldState, newState): HighlightState {
            // Check for external ranges update
            const rangesMeta = tr.getMeta(highlightRangesKey) as
              | SentenceRange[]
              | null
              | undefined;
            const indexMeta = tr.getMeta(highlightPluginKey) as
              | number[]
              | null
              | undefined;

            let nextRanges = prev.externalRanges;
            let nextIndices = prev.indices;
            let changed = false;

            if (rangesMeta !== undefined) {
              nextRanges = rangesMeta;
              changed = true;
            }

            if (indexMeta !== undefined) {
              if (indexMeta === null || indexMeta.length === 0) {
                // Clear highlight but preserve externalRanges
                return {
                  indices: null,
                  externalRanges: nextRanges,
                  decorations: DecorationSet.empty,
                };
              }
              nextIndices = indexMeta;
              changed = true;
            }

            if (changed && nextIndices !== null) {
              return {
                indices: nextIndices,
                externalRanges: nextRanges,
                decorations: buildDecorations(
                  newState.doc,
                  nextIndices,
                  className,
                  nextRanges,
                ),
              };
            }

            if (changed) {
              return { ...prev, externalRanges: nextRanges };
            }

            if (tr.docChanged && prev.indices !== null) {
              return {
                indices: prev.indices,
                externalRanges: prev.externalRanges,
                decorations: buildDecorations(
                  newState.doc,
                  prev.indices,
                  className,
                  prev.externalRanges,
                ),
              };
            }

            return prev;
          },
        },
        props: {
          decorations(state) {
            const pluginState = this.getState(state) as
              | HighlightState
              | undefined;
            return pluginState?.decorations ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
