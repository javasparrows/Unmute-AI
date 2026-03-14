import type { PaperCandidate } from "@/types/evidence";

export interface ProviderAdapter {
  name: string;
  search(query: string, options?: SearchOptions): Promise<PaperCandidate[]>;
  lookupByDoi?(doi: string): Promise<PaperCandidate | null>;
  lookupByPmid?(pmid: string): Promise<PaperCandidate | null>;
  lookupByArxivId?(arxivId: string): Promise<PaperCandidate | null>;
}

export interface SearchOptions {
  maxResults?: number;
  fromYear?: number;
  toYear?: number;
  fieldsOfStudy?: string[];
}

// Full-text retrieval types

export interface FullTextResult {
  paperId: string;
  source: "pmc" | "arxiv" | "s2orc" | "core" | "unpaywall";
  sections: PaperSection[];
  rawText?: string;
  format: "structured" | "raw";
}

export interface PaperSection {
  heading: string;
  sectionType?:
    | "INTRODUCTION"
    | "METHODS"
    | "RESULTS"
    | "DISCUSSION"
    | "ABSTRACT"
    | "CONCLUSION"
    | "OTHER";
  text: string;
}

export interface FullTextProvider {
  name: string;
  getFullText(identifier: {
    doi?: string;
    pmid?: string;
    pmcid?: string;
    arxivId?: string;
  }): Promise<FullTextResult | null>;
}
