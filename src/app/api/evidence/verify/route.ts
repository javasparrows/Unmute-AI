import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { providers } from "@/lib/providers";
import type {
  EvidenceVerifyRequest,
  EvidenceVerifyResponse,
} from "@/types/evidence";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as EvidenceVerifyRequest;
  const { candidate } = body;

  if (!candidate) {
    return Response.json({ error: "candidate required" }, { status: 400 });
  }

  // Step 1: Existence verification via DOI lookup
  const doi = candidate.externalIds.doi;
  let verified = false;
  let crossrefData = null;

  if (doi) {
    crossrefData = await providers.crossref.lookupByDoi!(doi);
    if (crossrefData) verified = true;
  }

  // Step 2: If DOI not found, try PMID
  if (!verified && candidate.externalIds.pmid) {
    const pmidData = await providers.pubmed.lookupByPmid!(
      candidate.externalIds.pmid,
    );
    if (pmidData) verified = true;
  }

  if (!verified) {
    return Response.json({
      paper: {
        id: "",
        title: candidate.title,
        year: candidate.year,
        identifiers: candidate.externalIds as Record<string, string>,
        verified: false,
      },
      evidenceSnippets: [],
      claimCards: [],
    } satisfies EvidenceVerifyResponse);
  }

  // Step 3: Create or find CanonicalPaper
  let paper = doi
    ? await prisma.canonicalPaper.findFirst({
        where: {
          identifiers: { some: { provider: "crossref", externalId: doi } },
        },
        include: { identifiers: true },
      })
    : null;

  if (!paper) {
    paper = await prisma.canonicalPaper.create({
      data: {
        title: crossrefData?.title ?? candidate.title,
        abstract: crossrefData?.abstract ?? candidate.abstract,
        authors: (crossrefData?.authors ?? candidate.authors)?.map((a) => ({ name: a.name })) ?? [],
        year: crossrefData?.year ?? candidate.year,
        venue: crossrefData?.venue ?? candidate.venue,
        citationCount: crossrefData?.citationCount ?? candidate.citationCount ?? 0,
        influentialCount: candidate.influentialCitationCount ?? 0,
        fieldsOfStudy: candidate.fieldsOfStudy ?? [],
        identifiers: {
          create: Object.entries(candidate.externalIds)
            .filter(
              (entry): entry is [string, string] =>
                entry[1] !== undefined && entry[1] !== null,
            )
            .map(([provider, externalId]) => ({
              provider: mapProviderKey(provider),
              externalId,
            })),
        },
      },
      include: { identifiers: true },
    });
  }

  const identifiers: Record<string, string> = {};
  for (const id of paper.identifiers) {
    identifiers[id.provider] = id.externalId;
  }

  return Response.json({
    paper: {
      id: paper.id,
      title: paper.title,
      year: paper.year ?? undefined,
      identifiers,
      verified: true,
    },
    evidenceSnippets: [],
    claimCards: [],
  } satisfies EvidenceVerifyResponse);
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
