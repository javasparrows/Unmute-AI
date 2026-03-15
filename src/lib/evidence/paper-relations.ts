import { prisma } from "@/lib/prisma";

export type RelationType = "cites" | "cited_by" | "related";

/**
 * Store a relation between two papers. Idempotent (uses upsert).
 */
export async function addPaperRelation(
  fromPaperId: string,
  toPaperId: string,
  type: RelationType,
): Promise<void> {
  await prisma.paperRelation.upsert({
    where: {
      fromPaperId_toPaperId_type: { fromPaperId, toPaperId, type },
    },
    create: { fromPaperId, toPaperId, type },
    update: {},
  });
}

/**
 * Store multiple relations at once.
 */
export async function addPaperRelations(
  relations: { fromPaperId: string; toPaperId: string; type: RelationType }[],
): Promise<void> {
  await Promise.allSettled(
    relations.map((r) => addPaperRelation(r.fromPaperId, r.toPaperId, r.type)),
  );
}

/**
 * Get related papers for a given paper.
 */
export async function getRelatedPapers(
  paperId: string,
  types?: RelationType[],
): Promise<
  {
    id: string;
    title: string;
    authors: unknown;
    year: number | null;
    venue: string | null;
    citationCount: number;
    relationType: string;
  }[]
> {
  const where = types
    ? { fromPaperId: paperId, type: { in: types } }
    : { fromPaperId: paperId };

  const relations = await prisma.paperRelation.findMany({
    where,
    include: {
      toPaper: {
        select: {
          id: true,
          title: true,
          authors: true,
          year: true,
          venue: true,
          citationCount: true,
        },
      },
    },
    orderBy: { toPaper: { citationCount: "desc" } },
    take: 20,
  });

  return relations.map((r) => ({
    ...r.toPaper,
    relationType: r.type,
  }));
}

/**
 * Suggest papers that are frequently cited by the papers in a document
 * but not yet cited in the document itself. These are "missing" papers
 * the researcher may want to add.
 */
export async function suggestMissingPapers(
  documentId: string,
): Promise<
  {
    id: string;
    title: string;
    authors: unknown;
    year: number | null;
    venue: string | null;
    citationCount: number;
    citedByCount: number;
  }[]
> {
  // Get papers already cited in this document
  const existingCitations = await prisma.manuscriptCitation.findMany({
    where: { documentId },
    select: { paperId: true },
  });

  const citedPaperIds = existingCitations.map((c) => c.paperId);
  if (citedPaperIds.length === 0) return [];

  // Find papers that are related to (cited by) the document's papers
  // but are not themselves cited in the document
  const candidates = await prisma.paperRelation.findMany({
    where: {
      fromPaperId: { in: citedPaperIds },
      type: { in: ["cites", "related"] },
      toPaperId: { notIn: citedPaperIds },
    },
    include: {
      toPaper: {
        select: {
          id: true,
          title: true,
          authors: true,
          year: true,
          venue: true,
          citationCount: true,
        },
      },
    },
  });

  // Count how many of the document's cited papers reference each candidate
  const candidateMap = new Map<
    string,
    {
      id: string;
      title: string;
      authors: unknown;
      year: number | null;
      venue: string | null;
      citationCount: number;
      citedByCount: number;
    }
  >();

  for (const rel of candidates) {
    const existing = candidateMap.get(rel.toPaperId);
    if (existing) {
      existing.citedByCount++;
    } else {
      candidateMap.set(rel.toPaperId, {
        ...rel.toPaper,
        citedByCount: 1,
      });
    }
  }

  // Sort by how many of our papers reference them (descending), then by citation count
  return Array.from(candidateMap.values())
    .sort(
      (a, b) =>
        b.citedByCount - a.citedByCount || b.citationCount - a.citationCount,
    )
    .slice(0, 10);
}
