import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderEvidencePptx } from "@/lib/export/render-evidence-pptx";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return Response.json({ error: "documentId required" }, { status: 400 });
  }

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { title: true },
  });

  if (!doc) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  const mappings = await prisma.evidenceMapping.findMany({
    where: { documentId },
    include: {
      manuscriptCitation: {
        include: {
          paper: {
            include: { identifiers: true },
          },
        },
      },
    },
    orderBy: { sentenceIndex: "asc" },
  });

  const slides = mappings.map((m) => {
    const authors = Array.isArray(m.manuscriptCitation.paper.authors)
      ? (m.manuscriptCitation.paper.authors as { name: string }[]).map(
          (a) => a.name,
        )
      : [];
    const doi =
      m.manuscriptCitation.paper.identifiers.find(
        (i) => i.provider === "crossref",
      )?.externalId ?? null;

    return {
      manuscriptSentence: m.manuscriptSentence,
      manuscriptSection: m.sectionType,
      supportingPassage: m.supportingPassage,
      paperTitle: m.manuscriptCitation.paper.title,
      paperAuthors: authors.length > 0 ? formatAuthors(authors) : "Unknown",
      paperYear: m.manuscriptCitation.paper.year,
      paperSection: m.citedPaperSection,
      paperPage: m.citedPaperPage,
      doi,
      confidence: m.confidence,
      rationale: m.mappingRationale,
      humanVerified: m.humanVerified,
      verifiedBy: m.verifiedBy,
      verifiedAt: m.verifiedAt,
    };
  });

  const buffer = await renderEvidencePptx(doc.title, slides);

  const safeTitle =
    doc.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50) || "evidence";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${safeTitle}_evidence.pptx"`,
    },
  });
}

function formatAuthors(names: string[]): string {
  if (names.length === 0) return "Unknown";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]} et al.`;
}
