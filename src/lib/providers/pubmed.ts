import type { PaperCandidate } from "@/types/evidence";
import type { ProviderAdapter, SearchOptions } from "./types";

const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

interface ESearchResult {
  esearchresult?: {
    idlist?: string[];
    count?: string;
  };
}

interface PubMedSummaryAuthor {
  name?: string;
  authtype?: string;
}

interface PubMedArticleId {
  idtype?: string;
  value?: string;
}

interface PubMedSummaryDoc {
  uid?: string;
  title?: string;
  sortfirstauthor?: string;
  authors?: PubMedSummaryAuthor[];
  pubdate?: string;
  source?: string; // journal name
  fulljournalname?: string;
  elocationid?: string;
  articleids?: PubMedArticleId[];
}

interface ESummaryResult {
  result?: {
    uids?: string[];
    [pmid: string]: PubMedSummaryDoc | string[] | undefined;
  };
}

function extractYear(pubdate: string | undefined): number | undefined {
  if (!pubdate) return undefined;
  const match = pubdate.match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : undefined;
}

function extractDoi(
  articleIds: PubMedArticleId[] | undefined,
): string | undefined {
  if (!articleIds) return undefined;
  const doiEntry = articleIds.find((a) => a.idtype === "doi");
  return doiEntry?.value ?? undefined;
}

function toCandidate(doc: PubMedSummaryDoc): PaperCandidate {
  const doi = extractDoi(doc.articleids);

  return {
    title: doc.title ?? "",
    authors:
      doc.authors
        ?.filter((a) => a.authtype === "Author")
        .map((a) => ({ name: a.name ?? "" })) ?? [],
    year: extractYear(doc.pubdate),
    venue: doc.fulljournalname ?? doc.source,
    externalIds: {
      ...(doc.uid ? { pmid: doc.uid } : {}),
      ...(doi ? { doi } : {}),
    },
    source: "pubmed",
  };
}

async function fetchSummaries(
  pmids: string[],
): Promise<PaperCandidate[]> {
  if (pmids.length === 0) return [];

  try {
    const params = new URLSearchParams({
      db: "pubmed",
      id: pmids.join(","),
      retmode: "json",
    });

    const response = await fetch(
      `${EUTILS_BASE}/esummary.fcgi?${params.toString()}`,
    );
    if (!response.ok) return [];

    const data = (await response.json()) as ESummaryResult;
    if (!data.result?.uids) return [];

    return data.result.uids
      .map((uid) => {
        const doc = data.result?.[uid] as PubMedSummaryDoc | undefined;
        if (!doc || typeof doc !== "object" || Array.isArray(doc)) return null;
        return toCandidate(doc);
      })
      .filter((c): c is PaperCandidate => c !== null);
  } catch {
    return [];
  }
}

async function search(
  query: string,
  options?: SearchOptions,
): Promise<PaperCandidate[]> {
  try {
    const maxResults = options?.maxResults ?? 20;

    // Build search term with date filter
    let term = query;
    if (options?.fromYear) {
      term += ` AND ${String(options.fromYear)}:3000[pdat]`;
    }
    if (options?.toYear) {
      term += ` AND 1900:${String(options.toYear)}[pdat]`;
    }

    const searchParams = new URLSearchParams({
      db: "pubmed",
      term,
      retmax: String(maxResults),
      retmode: "json",
      sort: "relevance",
    });

    const searchResponse = await fetch(
      `${EUTILS_BASE}/esearch.fcgi?${searchParams.toString()}`,
    );
    if (!searchResponse.ok) return [];

    const searchData = (await searchResponse.json()) as ESearchResult;
    const pmids = searchData.esearchresult?.idlist ?? [];
    if (pmids.length === 0) return [];

    return fetchSummaries(pmids);
  } catch {
    return [];
  }
}

async function lookupByPmid(pmid: string): Promise<PaperCandidate | null> {
  const results = await fetchSummaries([pmid]);
  return results[0] ?? null;
}

export const pubmedAdapter: ProviderAdapter = {
  name: "pubmed",
  search,
  lookupByPmid,
};
