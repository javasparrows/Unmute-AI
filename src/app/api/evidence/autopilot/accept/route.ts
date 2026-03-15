import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { providers } from "@/lib/providers";
import { generateCiteKey } from "@/lib/evidence/cite-key";
import { generateBibTeXEntry, renderBibTeX } from "@/lib/evidence/bibtex";
import { findOrCreateCanonicalPaper } from "@/lib/evidence/paper-ingest";
import { addPaperRelation } from "@/lib/evidence/paper-relations";
import type { PaperCandidate } from "@/types/evidence";

interface AcceptRequest {
  documentId: string;
  candidate: PaperCandidate;
  sentenceIndex: number;
  sectionType: string;
  action: "ACCEPT" | "SKIP";
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as AcceptRequest;
  const { documentId, candidate, sentenceIndex, sectionType, action } = body;

  if (!documentId) {
    return Response.json({ error: "documentId required" }, { status: 400 });
  }

  if (action === "SKIP") {
    return Response.json({ action: "SKIP", sentenceIndex });
  }

  if (!candidate) {
    return Response.json(
      { error: "candidate required for ACCEPT" },
      { status: 400 }
    );
  }

  // 1. Verify paper exists (DOI lookup)
  const doi = candidate.externalIds?.doi;
  let verified = false;
  let crossrefData = null;

  if (doi) {
    crossrefData = await providers.crossref.lookupByDoi!(doi);
    if (crossrefData) verified = true;
  }

  if (!verified && candidate.externalIds?.pmid) {
    const pmidResult = await providers.pubmed.lookupByPmid!(
      candidate.externalIds.pmid
    );
    if (pmidResult) verified = true;
  }

  if (!verified) {
    return Response.json(
      { error: "Paper verification failed. Cannot cite unverified paper." },
      { status: 422 }
    );
  }

  // 2. Find or create CanonicalPaper (unified service)
  const { paper } = await findOrCreateCanonicalPaper(candidate, {
    enrichment: crossrefData,
    providerSnapshot: crossrefData
      ? { provider: "crossref", data: crossrefData }
      : undefined,
  });

  // 3. Generate cite key
  const existingCitations = await prisma.manuscriptCitation.findMany({
    where: { documentId },
    select: { citeKey: true },
  });
  const existingKeys = new Set(
    existingCitations.map((c) => c.citeKey).filter(Boolean) as string[]
  );

  const authors = candidate.authors?.map((a) => ({ name: a.name })) ?? [
    { name: "Unknown" },
  ];
  const citeKey = generateCiteKey(
    authors,
    candidate.year,
    candidate.title,
    existingKeys
  );

  // 4. Create ManuscriptCitation (upsert)
  const citation = await prisma.manuscriptCitation.upsert({
    where: { documentId_paperId: { documentId, paperId: paper.id } },
    create: {
      documentId,
      paperId: paper.id,
      sectionType,
      citeKey,
    },
    update: {},
  });

  // 5. Create anchor for this specific occurrence
  await prisma.manuscriptCitationAnchor.create({
    data: {
      manuscriptCitationId: citation.id,
      sectionType,
      sentenceIndex,
    },
  });

  // 6. Generate BibTeX entry
  const identifiers: Record<string, string> = {};
  for (const id of paper.identifiers) {
    if (id.provider === "crossref") identifiers.doi = id.externalId;
    if (id.provider === "pubmed") identifiers.pmid = id.externalId;
    if (id.provider === "arxiv") identifiers.arxivId = id.externalId;
  }

  const bibEntry = generateBibTeXEntry(
    {
      ...candidate,
      doi: identifiers.doi,
      pmid: identifiers.pmid,
      arxivId: identifiers.arxivId,
    },
    citeKey
  );

  // Background: create relations between this paper and other cited papers
  const otherCitations = await prisma.manuscriptCitation.findMany({
    where: { documentId, paperId: { not: paper.id } },
    select: { paperId: true },
  });

  // Fire-and-forget: don't await
  Promise.allSettled(
    otherCitations.map((other) =>
      addPaperRelation(paper.id, other.paperId, "related"),
    ),
  ).catch(() => {});

  return Response.json({
    action: "ACCEPT",
    sentenceIndex,
    citeKey,
    citeCommand: `\\cite{${citeKey}}`,
    paperId: paper.id,
    paperTitle: paper.title,
    bibtex: renderBibTeX(bibEntry),
  });
}
