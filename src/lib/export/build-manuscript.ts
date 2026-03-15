import { prisma } from "@/lib/prisma";
import { normalizeSections, getSectionLabel } from "@/lib/sections";
import type { ExportManuscript, ExportSection, ExportCitation } from "./types";

export async function buildExportManuscript(
  documentId: string,
): Promise<ExportManuscript> {
  const doc = await prisma.document.findUniqueOrThrow({
    where: { id: documentId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
      manuscriptCitations: {
        include: {
          paper: {
            include: { identifiers: true },
          },
        },
      },
    },
  });

  const version = doc.versions[0];
  if (!version) throw new Error("No version found");

  const text = version.translatedText || "";
  const paragraphs = text.split("\n\n").filter(Boolean);
  const sectionMeta = normalizeSections(version.sections, text);

  // Build sections from metadata
  const sections: ExportSection[] = sectionMeta.items.map((item) => ({
    type: item.type,
    heading: item.heading || getSectionLabel(item.type),
    paragraphs: paragraphs.slice(item.startParagraph, item.endParagraph),
  }));

  // If no sections detected (single OTHER), treat as flat document
  if (sections.length === 1 && sections[0].type === "OTHER") {
    sections[0].heading = "";
    sections[0].paragraphs = paragraphs;
  }

  // Build citation list
  const citations: ExportCitation[] = doc.manuscriptCitations.map((mc) => {
    const ids: Record<string, string> = {};
    for (const pid of mc.paper.identifiers) {
      if (pid.provider === "crossref") ids.doi = pid.externalId;
      if (pid.provider === "pubmed") ids.pmid = pid.externalId;
      if (pid.provider === "arxiv") ids.arxivId = pid.externalId;
    }
    const authors = Array.isArray(mc.paper.authors)
      ? (mc.paper.authors as { name: string }[])
      : [];
    return {
      citeKey: mc.citeKey || mc.paper.id.slice(0, 8),
      authors,
      title: mc.paper.title,
      year: mc.paper.year ?? undefined,
      venue: mc.paper.venue ?? undefined,
      ...ids,
    };
  });

  return {
    title: doc.title,
    sections,
    citations,
    journal: version.journal ?? undefined,
    language: version.targetLang,
  };
}
