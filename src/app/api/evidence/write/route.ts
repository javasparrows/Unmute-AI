import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateGroundedDraft } from "@/lib/evidence/grounded-writer";
import type { SectionType } from "@/types/evidence";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    documentId,
    section,
    userIntent,
    targetLanguage,
    journalId,
    existingContext,
  } = body;

  if (!documentId || !section || !userIntent) {
    return Response.json(
      { error: "documentId, section, and userIntent required" },
      { status: 400 },
    );
  }

  // Get approved ClaimCards for this document's citations
  const citations = await prisma.manuscriptCitation.findMany({
    where: { documentId },
    include: {
      paper: {
        include: {
          claimCards: {
            where: {
              supportLabel: "SUPPORTED",
              confidence: { gte: 0.65 },
            },
          },
          identifiers: true,
        },
      },
    },
  });

  const claimCards = citations.flatMap((c) => {
    // Build cite key from first author + year
    const firstAuthor = c.paper.title.split(" ")[0]; // Fallback
    const citeKey = `${firstAuthor}, ${c.paper.year || "n.d."}`;

    return c.paper.claimCards.map((cc) => ({
      id: cc.id,
      paperId: c.paper.id,
      paperTitle: c.paper.title,
      paperYear: c.paper.year ?? undefined,
      paperAuthors: firstAuthor,
      subject: cc.subject,
      relation: cc.relation,
      object: cc.object,
      polarity: cc.polarity,
      supportLabel: cc.supportLabel,
      confidence: cc.confidence,
      evidenceTier: cc.evidenceTier,
      citeKey,
    }));
  });

  try {
    const result = await generateGroundedDraft({
      section: section as SectionType,
      userIntent,
      claimCards,
      targetLanguage: targetLanguage || "en",
      journalId,
      existingContext,
    });

    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Writing failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
