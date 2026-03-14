import type { FullTextResult, PaperSection } from "./types";

const S2_API_BASE = "https://api.semanticscholar.org/graph/v1";

interface S2PaperResponse {
  paperId?: string;
  abstract?: string;
  tldr?: { text?: string };
  openAccessPdf?: { url?: string };
}

interface PaperIdentifiers {
  doi?: string;
  pmid?: string;
  arxivId?: string;
}

/**
 * Build a Semantic Scholar paper query string from available identifiers.
 */
function buildS2Query(identifier: PaperIdentifiers): string | null {
  if (identifier.doi) return `DOI:${identifier.doi}`;
  if (identifier.pmid) return `PMID:${identifier.pmid}`;
  if (identifier.arxivId) return `ARXIV:${identifier.arxivId}`;
  return null;
}

/**
 * S2ORC adapter: retrieves abstract + TLDR from Semantic Scholar Graph API.
 *
 * Note: The S2 REST API v1 does not return full body text.
 * For full structured text, the S2ORC dataset bulk download would be needed.
 * This adapter provides abstract + TLDR as the baseline.
 */
export const s2orcAdapter = {
  name: "s2orc",

  async getFullText(
    identifier: PaperIdentifiers,
  ): Promise<FullTextResult | null> {
    const s2Query = buildS2Query(identifier);
    if (!s2Query) return null;

    try {
      const res = await fetch(
        `${S2_API_BASE}/paper/${encodeURIComponent(s2Query)}?fields=title,abstract,tldr,openAccessPdf,publicationTypes,s2FieldsOfStudy`,
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as S2PaperResponse;

      const sections: PaperSection[] = [];

      if (data.abstract) {
        sections.push({
          heading: "Abstract",
          sectionType: "ABSTRACT",
          text: data.abstract,
        });
      }

      if (data.tldr?.text) {
        sections.push({
          heading: "TLDR Summary",
          sectionType: "OTHER",
          text: data.tldr.text,
        });
      }

      if (sections.length === 0) return null;

      return {
        paperId: data.paperId ?? s2Query,
        source: "s2orc",
        sections,
        format: "structured",
      };
    } catch {
      return null;
    }
  },

  /**
   * Get open access PDF URL from Semantic Scholar.
   */
  async getOpenAccessPdfUrl(
    identifier: PaperIdentifiers,
  ): Promise<string | null> {
    const s2Query = buildS2Query(identifier);
    if (!s2Query) return null;

    try {
      const res = await fetch(
        `${S2_API_BASE}/paper/${encodeURIComponent(s2Query)}?fields=openAccessPdf`,
      );
      if (!res.ok) return null;
      const data = (await res.json()) as S2PaperResponse;
      return data.openAccessPdf?.url ?? null;
    } catch {
      return null;
    }
  },
};
