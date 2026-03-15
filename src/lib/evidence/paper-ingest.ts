import { prisma } from "@/lib/prisma";
import type { PaperCandidate } from "@/types/evidence";

type CanonicalPaperWithIdentifiers = Awaited<
  ReturnType<typeof prisma.canonicalPaper.findFirst<{ include: { identifiers: true } }>>
> & {};

interface FindOrCreateResult {
  paper: NonNullable<CanonicalPaperWithIdentifiers>;
  created: boolean;
}

interface IngestOptions {
  enrichment?: PaperCandidate | null;
  providerSnapshot?: {
    provider: string;
    data: unknown;
  };
}

function mapProviderKey(key: string): string {
  switch (key) {
    case "doi":
      return "crossref";
    case "pmid":
      return "pubmed";
    case "arxiv_id":
      return "arxiv";
    default:
      return key;
  }
}

export async function findOrCreateCanonicalPaper(
  candidate: PaperCandidate,
  options: IngestOptions = {},
): Promise<FindOrCreateResult> {
  const { enrichment, providerSnapshot } = options;
  const ids = candidate.externalIds;

  // 1. Look up existing paper by DOI, PMID, or arXiv ID
  const lookups: { provider: string; externalId: string }[] = [];
  if (ids.doi) lookups.push({ provider: "crossref", externalId: ids.doi });
  if (ids.pmid) lookups.push({ provider: "pubmed", externalId: ids.pmid });
  if (ids.arxiv_id) lookups.push({ provider: "arxiv", externalId: ids.arxiv_id });

  for (const lookup of lookups) {
    const existing = await prisma.canonicalPaper.findFirst({
      where: {
        identifiers: { some: lookup },
      },
      include: { identifiers: true },
    });
    if (existing) {
      return { paper: existing, created: false };
    }
  }

  // 2. Merge enrichment data (prefer enrichment over candidate)
  const source = enrichment ?? candidate;
  const authors = (source.authors ?? candidate.authors)?.map((a) => ({
    name: a.name,
    affiliations: a.affiliations,
  })) ?? [];

  // 3. Create new CanonicalPaper
  const paper = await prisma.canonicalPaper.create({
    data: {
      title: source.title ?? candidate.title,
      abstract: source.abstract ?? candidate.abstract,
      authors,
      year: source.year ?? candidate.year,
      venue: source.venue ?? candidate.venue,
      citationCount: source.citationCount ?? candidate.citationCount ?? 0,
      influentialCount: candidate.influentialCitationCount ?? 0,
      fieldsOfStudy: candidate.fieldsOfStudy ?? [],
      orcids: candidate.orcids ?? [],
      rorIds: candidate.rorIds ?? [],
      identifiers: {
        create: Object.entries(candidate.externalIds)
          .filter(
            (entry): entry is [string, string] =>
              entry[1] !== undefined && entry[1] !== null && entry[1] !== "",
          )
          .map(([provider, externalId]) => ({
            provider: mapProviderKey(provider),
            externalId,
          })),
      },
    },
    include: { identifiers: true },
  });

  // 4. Save ProviderSnapshot if provided
  if (providerSnapshot) {
    await prisma.providerSnapshot.create({
      data: {
        paperId: paper.id,
        provider: providerSnapshot.provider,
        data: providerSnapshot.data as object,
      },
    });
  }

  return { paper, created: true };
}
