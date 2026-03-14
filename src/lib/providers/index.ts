import { openAlexAdapter } from "./openalex";
import { crossrefAdapter } from "./crossref";
import { pubmedAdapter } from "./pubmed";
import type { PaperCandidate } from "@/types/evidence";
import type { SearchOptions } from "./types";

export const providers = {
  openalex: openAlexAdapter,
  crossref: crossrefAdapter,
  pubmed: pubmedAdapter,
};

export async function searchAllProviders(
  query: string,
  options?: SearchOptions,
): Promise<PaperCandidate[]> {
  const results = await Promise.allSettled([
    openAlexAdapter.search(query, options),
    crossrefAdapter.search(query, options),
    pubmedAdapter.search(query, options),
  ]);

  const candidates: PaperCandidate[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      candidates.push(...result.value);
    }
  }

  return deduplicateCandidates(candidates);
}

function deduplicateCandidates(
  candidates: PaperCandidate[],
): PaperCandidate[] {
  // Deduplicate by DOI first, then by normalized title
  const seen = new Map<string, PaperCandidate>();
  for (const c of candidates) {
    const doi = c.externalIds.doi;
    if (doi && seen.has(doi)) continue;
    if (doi) {
      seen.set(doi, c);
    } else {
      const key = c.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 50);
      if (!seen.has(key)) seen.set(key, c);
    }
  }
  return Array.from(seen.values());
}

export type { ProviderAdapter, SearchOptions } from "./types";
