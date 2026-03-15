import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkCompliance } from "@/lib/guidelines/check-compliance";
import { getAllGuidelines } from "@/lib/guidelines/guideline-db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { documentId, guidelineId, text } = body;

  if (!documentId || !guidelineId || !text) {
    return Response.json(
      { error: "documentId, guidelineId, and text required" },
      { status: 400 },
    );
  }

  const result = await checkCompliance(guidelineId, text);

  // Store the report
  await prisma.complianceReport.create({
    data: {
      documentId,
      guidelineId,
      results: JSON.parse(JSON.stringify(result.results)),
      metCount: result.metCount,
      totalCount: result.totalCount,
      score: result.score,
    },
  });

  return Response.json(result);
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");

  if (mode === "guidelines") {
    return Response.json({
      guidelines: getAllGuidelines().map((g) => ({
        id: g.id,
        name: g.name,
        fullName: g.fullName,
        applicableDesigns: g.applicableDesigns,
        itemCount: g.items.length,
      })),
    });
  }

  const documentId = searchParams.get("documentId");
  if (!documentId) {
    return Response.json(
      { error: "documentId required" },
      { status: 400 },
    );
  }

  const reports = await prisma.complianceReport.findMany({
    where: { documentId },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ reports });
}
