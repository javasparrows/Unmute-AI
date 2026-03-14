import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runAdversarialReview } from "@/lib/evidence/adversarial-review";
import { compileClaims } from "@/lib/evidence/claim-compiler";
import type { SectionType } from "@/types/evidence";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { documentId, draftText, section } = body;

  if (!draftText || !section) {
    return Response.json(
      { error: "draftText and section required" },
      { status: 400 },
    );
  }

  // Get ClaimCards for this document
  let claimCards: {
    id: string;
    subject: string;
    relation: string;
    object: string;
    supportLabel: string;
    confidence: number;
    evidenceTier: string;
    paperTitle: string;
  }[] = [];

  if (documentId) {
    const citations = await prisma.manuscriptCitation.findMany({
      where: { documentId },
      include: {
        paper: {
          include: {
            claimCards: true,
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
        evidenceTier: cc.evidenceTier,
        paperTitle: c.paper.title,
      })),
    );
  }

  // Run claim coverage check first
  const coverageReport = await compileClaims(
    draftText,
    claimCards.map((cc) => ({
      id: cc.id,
      subject: cc.subject,
      relation: cc.relation,
      object: cc.object,
      supportLabel: cc.supportLabel,
      confidence: cc.confidence,
    })),
  );

  // Run adversarial review
  const reviewResult = await runAdversarialReview({
    draftText,
    section: section as SectionType,
    claimCards,
    coverageReport: {
      overallCoverage: coverageReport.overallCoverage,
      gaps: coverageReport.gaps,
    },
  });

  // Store review findings in database if documentId provided
  if (documentId) {
    await prisma.reviewFinding.createMany({
      data: reviewResult.findings.map((f) => ({
        documentId,
        severity: f.severity,
        type: f.type,
        targetSentenceId: f.sentenceIndex?.toString(),
        explanation: f.explanation,
        suggestedFix: f.suggestedFix ?? null,
      })),
    });
  }

  return Response.json({
    ...reviewResult,
    coverageReport: {
      overallCoverage: coverageReport.overallCoverage,
      gaps: coverageReport.gaps,
      sentences: coverageReport.sentences.map((s) => ({
        index: s.index,
        status: s.status,
        text: s.text,
      })),
    },
  });
}
