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
