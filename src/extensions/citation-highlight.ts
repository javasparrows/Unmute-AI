import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { citationStore } from "@/lib/citation-store";

const CITE_REGEX = /\\cite\{([^}]+)\}/g;

export const citationPluginKey = new PluginKey("citationHighlight");

function buildDecorations(doc: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;

    CITE_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = CITE_REGEX.exec(node.text)) !== null) {
      const start = pos + match.index;
      const end = start + match[0].length;
      const citeKey = match[1];

      const meta = citationStore.get(citeKey);
      const tooltip = meta
        ? `${meta.authors.map((a) => a.name).join(", ")} (${meta.year ?? "n.d."}) — ${meta.title}`
        : citeKey;

      decorations.push(
        Decoration.inline(start, end, {
          class: "citation-highlight",
          "data-cite-key": citeKey,
          title: tooltip,
        }),
      );
    }
  });

  if (decorations.length === 0) return DecorationSet.empty;
  return DecorationSet.create(doc, decorations);
}

/**
 * ProseMirror extension for citation highlighting via Decoration.inline().
 *
 * Scans the document for \cite{...} patterns and renders them as styled
 * inline decorations with tooltips showing paper metadata.
 *
 * To force a rebuild (e.g. after citation store updates), dispatch:
 *   tr.setMeta(citationPluginKey, "rebuild")
 */
export const CitationHighlight = Extension.create({
  name: "citationHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: citationPluginKey,
        state: {
          init(_, { doc }) {
            return buildDecorations(doc);
          },
          apply(tr, oldDecorations) {
            if (tr.docChanged || tr.getMeta(citationPluginKey) === "rebuild") {
              return buildDecorations(tr.doc);
            }
            return oldDecorations.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return citationPluginKey.getState(state) as DecorationSet;
          },
        },
      }),
    ];
  },
});
