import type { PaperCandidate } from "@/types/evidence";
import type { ProviderAdapter, SearchOptions } from "./types";

const JSTAGE_API = "https://api.jstage.jst.go.jp/searchapi/do";

interface JStageArticleTitle {
  en?: string;
  ja?: string;
}

interface JStageAuthor {
  name?: string;
}

interface JStageLink {
  "@_href"?: string;
}

interface JStageEntry {
  article_title?: JStageArticleTitle;
  author?: JStageAuthor[] | JStageAuthor;
  pubyear?: string;
  material_title?: { en?: string; ja?: string };
  doi?: string;
  link?: JStageLink[];
}

interface JStageResult {
  entry?: JStageEntry[];
  status?: { totalResults?: number };
}

const REQUEST_TIMEOUT_MS = 10000;

function toCandidate(entry: JStageEntry): PaperCandidate {
  const title =
    entry.article_title?.en ?? entry.article_title?.ja ?? "Untitled";

  const authors = Array.isArray(entry.author)
    ? entry.author.map((a) => ({ name: a.name ?? "Unknown" }))
    : entry.author?.name
      ? [{ name: entry.author.name }]
      : [];

  const year = entry.pubyear ? parseInt(entry.pubyear, 10) : undefined;
  const venue =
    entry.material_title?.en ?? entry.material_title?.ja ?? undefined;

  return {
    title,
    authors,
    year,
    venue,
    abstract: undefined,
    externalIds: {
      ...(entry.doi ? { doi: entry.doi } : {}),
    },
    citationCount: 0,
    source: "jstage",
  };
}

async function search(
  query: string,
  options?: SearchOptions,
): Promise<PaperCandidate[]> {
  try {
    const maxResults = options?.maxResults ?? 10;

    const params = new URLSearchParams({
      keyword: query,
      count: String(maxResults),
      start: "1",
    });

    const res = await fetch(`${JSTAGE_API}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) return [];

    const data: JStageResult = await res.json();
    if (!data.entry) return [];

    return data.entry.map(toCandidate);
  } catch {
    return [];
  }
}

export const jstageAdapter: ProviderAdapter = {
  name: "jstage",
  search,
};
