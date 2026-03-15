import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateBibTeXEntry, renderBibTeXFile } from "@/lib/evidence/bibtex";

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

  const citations = await prisma.manuscriptCitation.findMany({
    where: { documentId },
    include: {
      paper: {
        include: { identifiers: true },
      },
    },
  });

  const entries = citations.map((c) => {
    const identifiers: Record<string, string> = {};
    for (const id of c.paper.identifiers) {
      if (id.provider === "crossref") identifiers.doi = id.externalId;
      if (id.provider === "pubmed") identifiers.pmid = id.externalId;
      if (id.provider === "arxiv") identifiers.arxivId = id.externalId;
    }

    return generateBibTeXEntry(
      {
        title: c.paper.title,
        authors: [{ name: "Author" }], // TODO: store authors in CanonicalPaper
        year: c.paper.year,
        venue: c.paper.venue,
        doi: identifiers.doi,
        pmid: identifiers.pmid,
        arxivId: identifiers.arxivId,
      },
      c.citeKey || c.paper.id.slice(0, 8)
    );
  });

  const bibtex = renderBibTeXFile(entries);

  return new Response(bibtex, {
    headers: {
      "Content-Type": "application/x-bibtex",
      "Content-Disposition": `attachment; filename="references.bib"`,
    },
  });
}
