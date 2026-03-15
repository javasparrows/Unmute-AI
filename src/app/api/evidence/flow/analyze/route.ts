import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeFlow } from "@/lib/evidence/flow/analyze-flow";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { documentId, sectionType, text, researchTopic, resultsSummary } = body;

  if (!documentId || !text) {
    return Response.json({ error: "documentId and text required" }, { status: 400 });
  }

  const paragraphs = text.split("\n\n").filter((p: string) => p.trim().length > 0);

  if (paragraphs.length === 0) {
    return Response.json({ error: "No paragraphs to analyze" }, { status: 400 });
  }

  // Get current version number
  const latestVersion = await prisma.documentVersion.findFirst({
    where: { documentId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });

  const result = await analyzeFlow({
    sectionType: sectionType ?? "OTHER",
    paragraphs,
    researchTopic,
    resultsSummary,
  });

  // Store the analysis
  await prisma.paragraphAnalysis.create({
    data: {
      documentId,
      versionNumber: latestVersion?.versionNumber ?? 1,
      sectionType: sectionType ?? null,
      analysis: JSON.parse(JSON.stringify(result)),
      overallScore: result.overallScore,
      issueCount: result.issues.length,
    },
  });

  return Response.json(result);
}
