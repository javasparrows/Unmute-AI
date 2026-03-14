import type { PaperCandidate } from "@/types/evidence";
import type { FullTextResult, PaperSection, SearchOptions } from "./types";

const CORE_API_BASE = "https://api.core.ac.uk/v3";

interface CoreAuthor {
  name?: string;
}

interface CoreWork {
  id?: number;
  title?: string;
  authors?: CoreAuthor[];
  yearPublished?: number;
  abstract?: string;
  publisher?: string;
  doi?: string;
  citationCount?: number;
  fullText?: string;
}

interface CoreSearchResponse {
  results?: CoreWork[];
}

/**
 * CORE adapter: provides OA paper search and full-text retrieval as a fallback.
 * Free tier requires no registration. Rate limit: 5 single req/10 sec.
 */
export const coreAdapter = {
  name: "core",

  async search(
    query: string,
    options?: SearchOptions,
  ): Promise<PaperCandidate[]> {
    try {
      const limit = options?.maxResults ?? 10;
      const res = await fetch(
        `${CORE_API_BASE}/search/works?q=${encodeURIComponent(query)}&limit=${String(limit)}`,
        {
          headers: { Accept: "application/json" },
        },
      );
      if (!res.ok) return [];
      const data = (await res.json()) as CoreSearchResponse;

      return (data.results ?? []).map(
        (work): PaperCandidate => ({
          title: work.title ?? "",
          authors: (work.authors ?? []).map((a) => ({
            name: a.name ?? "",
          })),
          year: work.yearPublished,
          abstract: work.abstract,
          venue: work.publisher,
          externalIds: {
            ...(work.doi ? { doi: work.doi } : {}),
            ...(work.id != null
              ? { openalex: work.id.toString() }
              : {}),
          },
          citationCount: work.citationCount,
          source: "openalex",
        }),
      );
    } catch {
      return [];
    }
  },

  async getFullText(identifier: {
    doi?: string;
  }): Promise<FullTextResult | null> {
    if (!identifier.doi) return null;

    try {
      // Search CORE by DOI to find full text
      const res = await fetch(
        `${CORE_API_BASE}/search/works?q=doi:"${encodeURIComponent(identifier.doi)}"&limit=1`,
        {
          headers: { Accept: "application/json" },
        },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as CoreSearchResponse;

      const work = data.results?.[0];
      if (!work?.fullText) return null;

      const sections: PaperSection[] = [
        {
          heading: "Full Text",
          sectionType: "OTHER",
          text: work.fullText,
        },
      ];

      return {
        paperId: work.id?.toString() ?? identifier.doi,
        source: "core",
        sections,
        rawText: work.fullText,
        format: "raw",
      };
    } catch {
      return null;
    }
  },
};
