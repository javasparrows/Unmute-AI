import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  AlignmentType,
} from "docx";
import type { ExportManuscript, ExportCitation } from "./types";

export async function renderDocx(
  manuscript: ExportManuscript,
): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      text: manuscript.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  );

  // Sections
  for (const section of manuscript.sections) {
    if (section.heading) {
      children.push(
        new Paragraph({
          text: cleanHeading(section.heading),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
      );
    }

    for (const paragraph of section.paragraphs) {
      const runs = parseCitations(paragraph, manuscript.citations);
      children.push(
        new Paragraph({
          children: runs,
          spacing: { after: 200 },
        }),
      );
    }
  }

  // Bibliography section
  if (manuscript.citations.length > 0) {
    children.push(
      new Paragraph({
        text: "References",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
    );

    for (const [index, citation] of manuscript.citations.entries()) {
      const authorStr = formatAuthors(citation.authors);
      const yearStr = citation.year ? `(${citation.year})` : "";
      const refText = `[${index + 1}] ${authorStr} ${yearStr}. ${citation.title}.${citation.venue ? ` ${citation.venue}.` : ""}${citation.doi ? ` doi:${citation.doi}` : ""}`;

      children.push(
        new Paragraph({
          children: [new TextRun({ text: refText, size: 20 })],
          spacing: { after: 100 },
        }),
      );
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

function cleanHeading(heading: string): string {
  // Remove markdown heading markers
  return heading.replace(/^#+\s*/, "").trim();
}

function parseCitations(
  text: string,
  citations: ExportCitation[],
): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /\\cite\{([^}]+)\}/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Text before citation
    if (match.index > lastIndex) {
      runs.push(new TextRun(text.slice(lastIndex, match.index)));
    }

    // Format citation as "(Author et al., Year)"
    const citeKey = match[1];
    const citation = citations.find((c) => c.citeKey === citeKey);
    if (citation) {
      const formatted = formatInlineCitation(citation);
      runs.push(new TextRun({ text: formatted, italics: false }));
    } else {
      runs.push(new TextRun({ text: `[${citeKey}]` }));
    }

    lastIndex = regex.lastIndex;
  }

  // Remaining text
  if (lastIndex < text.length) {
    runs.push(new TextRun(text.slice(lastIndex)));
  }

  if (runs.length === 0) {
    runs.push(new TextRun(text));
  }

  return runs;
}

function formatInlineCitation(citation: ExportCitation): string {
  const firstAuthor = citation.authors[0]?.name ?? "Unknown";
  const lastName = firstAuthor.split(/\s+/).pop() ?? firstAuthor;
  const etAl = citation.authors.length > 1 ? " et al." : "";
  const year = citation.year ?? "n.d.";
  return `(${lastName}${etAl}, ${year})`;
}

function formatAuthors(authors: { name: string }[]): string {
  if (authors.length === 0) return "Unknown";
  if (authors.length === 1) return authors[0].name;
  if (authors.length === 2) return `${authors[0].name} and ${authors[1].name}`;
  return `${authors[0].name} et al.`;
}
