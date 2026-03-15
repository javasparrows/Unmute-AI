import type { PaperCandidate } from "@/types/evidence";
import type { ProviderAdapter, SearchOptions } from "./types";

const BASE_URL = "https://api.openalex.org";
const MAILTO = "support@unmute-ai.com";

interface OpenAlexWork {
  id?: string;
  title?: string;
  display_name?: string;
  publication_year?: number;
  abstract_inverted_index?: Record<string, number[]>;
  primary_location?: {
    source?: { display_name?: string };
  };
  authorships?: {
    author?: { display_name?: string; orcid?: string };
    institutions?: { display_name?: string; ror?: string }[];
  }[];
  ids?: {
    doi?: string;
    pmid?: string;
    openalex?: string;
  };
  doi?: string;
  cited_by_count?: number;
  concepts?: { display_name?: string }[];
  topics?: { display_name?: string }[];
  relevance_score?: number;
}

function reconstructAbstract(
  invertedIndex: Record<string, number[]> | undefined,
): string | undefined {
  if (!invertedIndex) return undefined;
  const words: [number, string][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([pos, word]);
    }
  }
  words.sort((a, b) => a[0] - b[0]);
  return words.map(([, w]) => w).join(" ");
}

function parseDoi(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw.replace("https://doi.org/", "");
}

function parsePmid(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw.replace("https://pubmed.ncbi.nlm.nih.gov/", "").replace("/", "");
}

function parseOpenAlexId(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw.replace("https://openalex.org/", "");
}

function toCandidate(work: OpenAlexWork): PaperCandidate {
  const doi = parseDoi(work.doi ?? work.ids?.doi);
  const pmid = parsePmid(work.ids?.pmid);
  const openalexId = parseOpenAlexId(work.ids?.openalex ?? work.id);

  const fieldsOfStudy = [
    ...(work.concepts?.map((c) => c.display_name).filter(Boolean) ?? []),
    ...(work.topics?.map((t) => t.display_name).filter(Boolean) ?? []),
  ] as string[];

  // Extract unique ORCID and ROR identifiers from authorships
  const orcids: string[] = [];
  const rorIds: string[] = [];
  for (const authorship of work.authorships ?? []) {
    if (authorship.author?.orcid) {
      const orcid = authorship.author.orcid.replace("https://orcid.org/", "");
      if (!orcids.includes(orcid)) orcids.push(orcid);
    }
    for (const inst of authorship.institutions ?? []) {
      if (inst.ror) {
        const ror = inst.ror.replace("https://ror.org/", "");
        if (!rorIds.includes(ror)) rorIds.push(ror);
      }
    }
  }

  return {
    title: work.display_name ?? work.title ?? "",
    authors:
      work.authorships?.map((a) => ({
        name: a.author?.display_name ?? "",
        affiliations: a.institutions
          ?.map((i) => i.display_name)
          .filter(Boolean) as string[] | undefined,
      })) ?? [],
    year: work.publication_year,
    abstract: reconstructAbstract(work.abstract_inverted_index),
    venue: work.primary_location?.source?.display_name,
    externalIds: {
      ...(doi ? { doi } : {}),
      ...(pmid ? { pmid } : {}),
      ...(openalexId ? { openalex: openalexId } : {}),
    },
    citationCount: work.cited_by_count,
    fieldsOfStudy: fieldsOfStudy.length > 0 ? fieldsOfStudy : undefined,
    source: "openalex",
    relevanceScore: work.relevance_score,
    orcids: orcids.length > 0 ? orcids : undefined,
    rorIds: rorIds.length > 0 ? rorIds : undefined,
  };
}

async function search(
  query: string,
  options?: SearchOptions,
): Promise<PaperCandidate[]> {
  try {
    const maxResults = options?.maxResults ?? 20;
    const params = new URLSearchParams({
      search: query,
      sort: "relevance_score:desc",
      per_page: String(maxResults),
      mailto: MAILTO,
    });

    const filters: string[] = [];
    if (options?.fromYear) {
      filters.push(
        `from_publication_date:${String(options.fromYear)}-01-01`,
      );
    }
    if (options?.toYear) {
      filters.push(
        `to_publication_date:${String(options.toYear)}-12-31`,
      );
    }
    if (filters.length > 0) {
      params.set("filter", filters.join(","));
    }

    const response = await fetch(`${BASE_URL}/works?${params.toString()}`);
    if (!response.ok) return [];

    const data = (await response.json()) as { results?: OpenAlexWork[] };
    return (data.results ?? []).map(toCandidate);
  } catch {
    return [];
  }
}

async function lookupByDoi(doi: string): Promise<PaperCandidate | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/works/doi:${encodeURIComponent(doi)}?mailto=${MAILTO}`,
    );
    if (!response.ok) return null;

    const work = (await response.json()) as OpenAlexWork;
    return toCandidate(work);
  } catch {
    return null;
  }
}

async function lookupByPmid(pmid: string): Promise<PaperCandidate | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/works/pmid:${encodeURIComponent(pmid)}?mailto=${MAILTO}`,
    );
    if (!response.ok) return null;

    const work = (await response.json()) as OpenAlexWork;
    return toCandidate(work);
  } catch {
    return null;
  }
}

export const openAlexAdapter: ProviderAdapter = {
  name: "openalex",
  search,
  lookupByDoi,
  lookupByPmid,
};
