import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compileClaims } from "@/lib/evidence/claim-compiler";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { draftText, documentId } = body;

  if (!draftText) {
    return Response.json({ error: "draftText required" }, { status: 400 });
  }

  // Get all approved ClaimCards for this document's citations
  const MIN_CLAIM_CONFIDENCE = 0.65;
  let claimCards: {
    id: string;
    subject: string;
    relation: string;
    object: string;
    supportLabel: string;
    confidence: number;
  }[] = [];

  if (documentId) {
    const citations = await prisma.manuscriptCitation.findMany({
      where: { documentId },
      include: {
        paper: {
          include: {
            claimCards: {
              where: {
                supportLabel: "SUPPORTED",
                confidence: { gte: MIN_CLAIM_CONFIDENCE },
              },
            },
          },
        },
      },
    });

    claimCards = citations.flatMap((c) =>
      c.paper.claimCards.map((cc) => ({
        id: cc.id,
        subject: cc.subject,
        relation: cc.relation,
        object: cc.object,
        supportLabel: cc.supportLabel,
        confidence: cc.confidence,
      })),
    );
  }

  const result = await compileClaims(draftText, claimCards);
  return Response.json(result);
}
