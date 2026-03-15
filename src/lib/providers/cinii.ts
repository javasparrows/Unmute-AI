import type { PaperCandidate } from "@/types/evidence";
import type { ProviderAdapter, SearchOptions } from "./types";

const CINII_API = "https://cir.nii.ac.jp/opensearch/articles";

const REQUEST_TIMEOUT_MS = 10000;

interface CiNiiItem {
  title?: string;
  "dc:title"?: string;
  "dc:creator"?: (string | { name: string })[];
  creator?: (string | { name: string })[];
  "prism:publicationDate"?: string;
  "prism:publicationName"?: string;
  "prism:doi"?: string;
}

function toCandidate(item: CiNiiItem): PaperCandidate {
  const title = item.title ?? item["dc:title"] ?? "Untitled";

  const creators = item["dc:creator"] ?? item.creator;
  const authors = Array.isArray(creators)
    ? creators.map((c) =>
        typeof c === "string" ? { name: c } : { name: c.name ?? "Unknown" },
      )
    : [];

  const rawDate = item["prism:publicationDate"];
  const year = rawDate
    ? parseInt(String(rawDate).slice(0, 4), 10)
    : undefined;

  const doi = item["prism:doi"] ?? undefined;

  return {
    title,
    authors,
    year,
    venue: item["prism:publicationName"] ?? undefined,
    abstract: undefined,
    externalIds: {
      ...(doi ? { doi } : {}),
    },
    citationCount: 0,
    source: "cinii",
  };
}

async function search(
  query: string,
  options?: SearchOptions,
): Promise<PaperCandidate[]> {
  try {
    const maxResults = options?.maxResults ?? 10;

    const params = new URLSearchParams({
      q: query,
      count: String(maxResults),
      format: "json",
    });

    const res = await fetch(`${CINII_API}?${params.toString()}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const items: CiNiiItem[] = data?.items ?? data?.["@graph"] ?? [];

    return items.slice(0, maxResults).map(toCandidate);
  } catch {
    return [];
  }
}

export const ciniiAdapter: ProviderAdapter = {
  name: "cinii",
  search,
};
