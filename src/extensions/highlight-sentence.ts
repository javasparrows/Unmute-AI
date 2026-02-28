import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const highlightPluginKey = new PluginKey("highlightSentence");

interface SentenceRange {
  from: number;
  to: number;
}

interface HighlightState {
  index: number | null;
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
): number {
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
  sentenceIndex: number,
  className: string,
): DecorationSet {
  const ranges = getSentenceRanges(doc);
  if (sentenceIndex < 0 || sentenceIndex >= ranges.length) {
    return DecorationSet.empty;
  }

  const range = ranges[sentenceIndex];
  return DecorationSet.create(doc, [
    Decoration.inline(range.from, range.to, { class: className }),
  ]);
}

export interface HighlightSentenceOptions {
  className: string;
}

/**
 * ProseMirror extension for sentence-level highlighting via Decoration.inline().
 *
 * To update the highlight, dispatch a transaction with:
 *   tr.setMeta(highlightPluginKey, sentenceIndex)  // number to highlight
 *   tr.setMeta(highlightPluginKey, null)            // clear highlight
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
      index: null,
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
            const meta = tr.getMeta(highlightPluginKey);

            if (meta !== undefined) {
              if (meta === null || meta < 0) return emptyState;
              return {
                index: meta as number,
                decorations: buildDecorations(
                  newState.doc,
                  meta as number,
                  className,
                ),
              };
            }

            if (tr.docChanged && prev.index !== null) {
              return {
                index: prev.index,
                decorations: buildDecorations(
                  newState.doc,
                  prev.index,
                  className,
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
