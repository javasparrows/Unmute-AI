import { auth } from "@/lib/auth";
import { providers } from "@/lib/providers";
import { findOrCreateCanonicalPaper } from "@/lib/evidence/paper-ingest";
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

  // Step 3: Find or create CanonicalPaper (unified service)
  const { paper } = await findOrCreateCanonicalPaper(candidate, {
    enrichment: crossrefData,
    providerSnapshot: crossrefData
      ? { provider: "crossref", data: crossrefData }
      : undefined,
  });

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
