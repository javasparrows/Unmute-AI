import type { PaperCandidate } from "@/types/evidence";
import type { ProviderAdapter, SearchOptions } from "./types";

const BASE_URL = "https://api.crossref.org";
const MAILTO = "support@unmute-ai.com";

interface CrossrefAuthor {
  given?: string;
  family?: string;
  name?: string;
  affiliation?: { name?: string }[];
}

interface CrossrefWork {
  DOI?: string;
  title?: string[];
  author?: CrossrefAuthor[];
  published?: { "date-parts"?: number[][] };
  "published-print"?: { "date-parts"?: number[][] };
  "published-online"?: { "date-parts"?: number[][] };
  abstract?: string;
  "container-title"?: string[];
  "is-referenced-by-count"?: number;
  subject?: string[];
  score?: number;
}

function extractYear(work: CrossrefWork): number | undefined {
  const dateParts =
    work.published?.["date-parts"]?.[0] ??
    work["published-print"]?.["date-parts"]?.[0] ??
    work["published-online"]?.["date-parts"]?.[0];
  return dateParts?.[0] ?? undefined;
}

function cleanAbstract(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  // Crossref abstracts often contain JATS XML tags
  return raw.replace(/<[^>]+>/g, "").trim();
}

function toCandidate(work: CrossrefWork): PaperCandidate {
  return {
    title: work.title?.[0] ?? "",
    authors:
      work.author?.map((a) => ({
        name: a.name ?? [a.given, a.family].filter(Boolean).join(" "),
        affiliations: a.affiliation
          ?.map((aff) => aff.name)
          .filter(Boolean) as string[] | undefined,
      })) ?? [],
    year: extractYear(work),
    abstract: cleanAbstract(work.abstract),
    venue: work["container-title"]?.[0],
    externalIds: {
      ...(work.DOI ? { doi: work.DOI } : {}),
    },
    citationCount: work["is-referenced-by-count"],
    fieldsOfStudy: work.subject,
    source: "crossref",
    relevanceScore: work.score,
  };
}

async function search(
  query: string,
  options?: SearchOptions,
): Promise<PaperCandidate[]> {
  try {
    const maxResults = options?.maxResults ?? 20;
    const params = new URLSearchParams({
      query,
      rows: String(maxResults),
      mailto: MAILTO,
    });

    if (options?.fromYear) {
      params.set(
        "filter",
        `from-pub-date:${String(options.fromYear)}`,
      );
    }

    const response = await fetch(`${BASE_URL}/works?${params.toString()}`);
    if (!response.ok) return [];

    const data = (await response.json()) as {
      message?: { items?: CrossrefWork[] };
    };
    return (data.message?.items ?? []).map(toCandidate);
  } catch {
    return [];
  }
}

async function lookupByDoi(doi: string): Promise<PaperCandidate | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/works/${encodeURIComponent(doi)}?mailto=${MAILTO}`,
    );
    if (!response.ok) return null;

    const data = (await response.json()) as { message?: CrossrefWork };
    if (!data.message) return null;
    return toCandidate(data.message);
  } catch {
    return null;
  }
}

export const crossrefAdapter: ProviderAdapter = {
  name: "crossref",
  search,
  lookupByDoi,
};
