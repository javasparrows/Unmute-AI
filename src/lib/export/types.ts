import type { SectionType } from "@/lib/sections";

export interface ExportSection {
  type: SectionType;
  heading: string;
  paragraphs: string[]; // plain text paragraphs, may contain \cite{key}
}

export interface ExportCitation {
  citeKey: string;
  authors: { name: string }[];
  title: string;
  year?: number;
  venue?: string;
  doi?: string;
  pmid?: string;
  arxivId?: string;
}

export interface ExportManuscript {
  title: string;
  sections: ExportSection[];
  citations: ExportCitation[];
  journal?: string;
  language: string;
}
