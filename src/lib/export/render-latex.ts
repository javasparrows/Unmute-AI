import { generateBibTeXEntry, renderBibTeXFile } from "@/lib/evidence/bibtex";
import type { ExportManuscript } from "./types";

export function renderLatex(manuscript: ExportManuscript): {
  tex: string;
  bib: string;
} {
  const lines: string[] = [];

  // Preamble
  lines.push("\\documentclass[12pt]{article}");
  lines.push("\\usepackage[utf8]{inputenc}");
  lines.push("\\usepackage[T1]{fontenc}");
  lines.push("\\usepackage{hyperref}");
  lines.push("");
  lines.push(`\\title{${escapeLatex(manuscript.title)}}`);
  lines.push("\\date{}");
  lines.push("");
  lines.push("\\begin{document}");
  lines.push("\\maketitle");
  lines.push("");

  // Sections
  for (const section of manuscript.sections) {
    if (section.heading) {
      lines.push(`\\section{${escapeLatex(section.heading)}}`);
      lines.push("");
    }
    for (const paragraph of section.paragraphs) {
      // \cite{key} is already in LaTeX format -- pass through
      lines.push(escapeLatexPreserveCite(paragraph));
      lines.push("");
    }
  }

  // Bibliography reference
  if (manuscript.citations.length > 0) {
    lines.push("\\bibliographystyle{plain}");
    lines.push("\\bibliography{references}");
  }

  lines.push("");
  lines.push("\\end{document}");

  // Generate .bib file
  const bibEntries = manuscript.citations.map((c) =>
    generateBibTeXEntry(
      {
        title: c.title,
        authors: c.authors,
        year: c.year,
        venue: c.venue,
        doi: c.doi,
        pmid: c.pmid,
        arxivId: c.arxivId,
      },
      c.citeKey,
    ),
  );

  return {
    tex: lines.join("\n"),
    bib: renderBibTeXFile(bibEntries),
  };
}

function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[&%$#_{}~^]/g, (match) => `\\${match}`);
}

function escapeLatexPreserveCite(text: string): string {
  // Split by \cite{...} to preserve them, escape the rest
  return text.replace(
    /(\\cite\{[^}]+\})|([^\\]+|\\(?!cite\{))/g,
    (match, cite, other) => {
      if (cite) return cite;
      if (other) return escapeLatex(other);
      return match;
    },
  );
}
