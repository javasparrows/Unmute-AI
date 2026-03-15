interface BibTeXEntry {
  citeKey: string;
  entryType: "article" | "inproceedings" | "book" | "misc" | "phdthesis";
  fields: Record<string, string>;
}

interface PaperForBibTeX {
  title: string;
  authors: { name: string }[];
  year?: number | null;
  venue?: string | null;
  doi?: string | null;
  pmid?: string | null;
  arxivId?: string | null;
  abstract?: string | null;
}

/**
 * Generate a BibTeX entry from paper metadata.
 * Never stored as string -- always regenerated from canonical data.
 */
export function generateBibTeXEntry(
  paper: PaperForBibTeX,
  citeKey: string
): BibTeXEntry {
  const entryType = inferEntryType(paper.venue);

  const fields: Record<string, string> = {};
  fields.title = `{${paper.title}}`;
  fields.author = paper.authors.map((a) => a.name).join(" and ");
  if (paper.year) fields.year = String(paper.year);
  if (paper.venue) {
    if (entryType === "inproceedings") {
      fields.booktitle = paper.venue;
    } else {
      fields.journal = paper.venue;
    }
  }
  if (paper.doi) fields.doi = paper.doi;
  if (paper.pmid) fields.pmid = paper.pmid;
  if (paper.arxivId) fields.eprint = paper.arxivId;

  return { citeKey, entryType, fields };
}

function inferEntryType(
  venue?: string | null
): BibTeXEntry["entryType"] {
  if (!venue) return "misc";
  const lower = venue.toLowerCase();
  if (
    lower.includes("conference") ||
    lower.includes("proceedings") ||
    lower.includes("workshop") ||
    lower.includes("symposium") ||
    lower.includes("icml") ||
    lower.includes("neurips") ||
    lower.includes("iclr") ||
    lower.includes("cvpr") ||
    lower.includes("eccv") ||
    lower.includes("iccv") ||
    lower.includes("acl") ||
    lower.includes("emnlp") ||
    lower.includes("naacl")
  ) {
    return "inproceedings";
  }
  if (lower.includes("thesis") || lower.includes("dissertation"))
    return "phdthesis";
  return "article";
}

/**
 * Render a BibTeX entry as a string.
 */
export function renderBibTeX(entry: BibTeXEntry): string {
  const lines = [`@${entry.entryType}{${entry.citeKey},`];
  for (const [key, value] of Object.entries(entry.fields)) {
    lines.push(`  ${key} = {${value}},`);
  }
  lines.push("}");
  return lines.join("\n");
}

/**
 * Render multiple BibTeX entries as a complete .bib file content.
 */
export function renderBibTeXFile(entries: BibTeXEntry[]): string {
  return entries.map(renderBibTeX).join("\n\n") + "\n";
}

export type { BibTeXEntry, PaperForBibTeX };
