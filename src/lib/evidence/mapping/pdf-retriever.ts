import { prisma } from "@/lib/prisma";

interface ParsedPage {
  pageNumber: number;
  text: string;
}

interface PdfRetrievalResult {
  paperId: string;
  pages: ParsedPage[];
  fullText: string;
  source: "pdf-parse" | "fulltext-api" | "cached";
}

/**
 * Retrieve and parse the full text of a cited paper.
 * Strategy: Check cache first, then try to get full text from existing providers.
 */
export async function retrieveCitedPaperText(
  paperId: string,
): Promise<PdfRetrievalResult | null> {
  // 1. Check PdfCache
  const cached = await prisma.pdfCache.findUnique({
    where: { paperId },
  });

  if (cached?.status === "parsed" && cached.parsedText) {
    const parsed = cached.parsedText as unknown as { pages: ParsedPage[] };
    return {
      paperId,
      pages: parsed.pages,
      fullText: parsed.pages.map((p) => p.text).join("\n\n"),
      source: "cached",
    };
  }

  // 2. Get identifiers for this paper
  const paper = await prisma.canonicalPaper.findUnique({
    where: { id: paperId },
    include: { identifiers: true },
  });

  if (!paper) return null;

  const doi = paper.identifiers.find(
    (i) => i.provider === "crossref",
  )?.externalId;
  const pmid = paper.identifiers.find(
    (i) => i.provider === "pubmed",
  )?.externalId;

  // 3. Try fulltext resolver (existing infrastructure)
  // Use the existing fulltext cascade: PMC > S2ORC > arXiv > Unpaywall > CORE
  let fullText: string | null = null;

  if (doi || pmid) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/evidence/fulltext`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doi,
            pmid,
            paperId,
          }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        if (data.fullText) {
          fullText = data.fullText;
        }
      }
    } catch {
      // Continue without full text
    }
  }

  // 4. If we got text, split into pseudo-pages and cache
  if (fullText) {
    const paragraphs = fullText.split("\n\n").filter(Boolean);
    const PARAGRAPHS_PER_PAGE = 5;
    const pages: ParsedPage[] = [];

    for (let i = 0; i < paragraphs.length; i += PARAGRAPHS_PER_PAGE) {
      pages.push({
        pageNumber: Math.floor(i / PARAGRAPHS_PER_PAGE) + 1,
        text: paragraphs.slice(i, i + PARAGRAPHS_PER_PAGE).join("\n\n"),
      });
    }

    // Cache the result
    await prisma.pdfCache.upsert({
      where: { paperId },
      create: {
        paperId,
        doi: doi ?? null,
        pdfUrl: doi ? `https://doi.org/${doi}` : "internal",
        storedPath: `text/${paperId}`,
        pageCount: pages.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parsedText: JSON.parse(JSON.stringify({ pages })) as any,
        status: "parsed",
      },
      update: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parsedText: JSON.parse(JSON.stringify({ pages })) as any,
        pageCount: pages.length,
        status: "parsed",
      },
    });

    return {
      paperId,
      pages,
      fullText,
      source: "fulltext-api",
    };
  }

  // 5. If no full text available, use abstract as fallback
  if (paper.abstract) {
    const pages: ParsedPage[] = [
      { pageNumber: 1, text: paper.abstract },
    ];

    return {
      paperId,
      pages,
      fullText: paper.abstract,
      source: "fulltext-api",
    };
  }

  return null;
}
