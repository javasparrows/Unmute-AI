import type { FullTextResult, PaperSection } from "./types";

const ARXIV_API_BASE = "http://export.arxiv.org/api";

/**
 * Clean an arXiv ID by removing common prefixes.
 */
function cleanArxivId(arxivId: string): string {
  return arxivId.replace(/^arXiv:/i, "");
}

/**
 * arXiv full-text adapter: retrieves abstract from arXiv Atom API.
 *
 * For MVP, extracts the abstract from arXiv API responses.
 * Full text would require LaTeX source parsing or PDF extraction via GROBID.
 */
export const arxivFullTextAdapter = {
  name: "arxiv",

  async getFullText(identifier: {
    arxivId?: string;
  }): Promise<FullTextResult | null> {
    if (!identifier.arxivId) return null;

    const cleanId = cleanArxivId(identifier.arxivId);

    try {
      const res = await fetch(
        `${ARXIV_API_BASE}/query?id_list=${cleanId}`,
      );
      if (!res.ok) return null;
      const xml = await res.text();

      const sections: PaperSection[] = [];

      // Extract abstract from Atom XML <summary> element
      const summaryMatch = xml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
      if (summaryMatch) {
        const abstract = summaryMatch[1].trim();
        sections.push({
          heading: "Abstract",
          sectionType: "ABSTRACT",
          text: abstract,
        });
      }

      if (sections.length === 0) return null;

      return {
        paperId: cleanId,
        source: "arxiv",
        sections,
        format: "structured",
      };
    } catch {
      return null;
    }
  },

  /**
   * Get PDF URL for an arXiv paper.
   */
  getPdfUrl(arxivId: string): string {
    const cleanId = cleanArxivId(arxivId);
    return `https://arxiv.org/pdf/${cleanId}.pdf`;
  },
};
