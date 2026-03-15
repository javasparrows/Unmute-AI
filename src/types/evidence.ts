// Search intent type
export type SectionType = "INTRODUCTION" | "METHODS" | "RESULTS" | "DISCUSSION";
export type FieldHint = "biomed" | "cs" | "general";
export type CoverageClass =
  | "landmark"
  | "recent_review"
  | "latest_primary"
  | "guideline";

export interface SearchIntent {
  section: SectionType;
  userLanguage: string;
  englishQuery: string;
  queryVariants: string[];
  studyTypeTargets: string[];
  dateRange?: { from?: string; to?: string };
  fieldHint?: FieldHint;
  allowPreprints: boolean;
  mustCoverClasses: CoverageClass[];
}

// Provider types
export type Provider =
  | "openalex"
  | "semantic_scholar"
  | "crossref"
  | "pubmed"
  | "arxiv"
  | "jstage"
  | "cinii";

export interface PaperCandidate {
  title: string;
  authors: { name: string; affiliations?: string[] }[];
  year?: number;
  abstract?: string;
  venue?: string;
  externalIds: Partial<
    Record<Provider | "doi" | "pmid" | "arxiv_id", string>
  >;
  citationCount?: number;
  influentialCitationCount?: number;
  fieldsOfStudy?: string[];
  source: Provider;
  relevanceScore?: number;
  orcids?: string[];
  rorIds?: string[];
}

// Verification types
export type SupportLabel =
  | "SUPPORTED"
  | "PARTIAL"
  | "CONTRADICTED"
  | "INSUFFICIENT";
export type EvidenceTier = "FULLTEXT" | "ABSTRACT_ONLY";
export type Polarity = "positive" | "negative" | "neutral";

export interface NormalizedClaim {
  subject: string;
  relation: string;
  object: string;
  qualifiers: Record<string, string>;
  polarity: Polarity;
}

// Review types
export type ReviewSeverity = "BLOCKER" | "MAJOR" | "MINOR";
export type ReviewType =
  | "UNSUPPORTED"
  | "MISATTRIBUTED"
  | "MISSING_KEY_PAPER"
  | "LOGIC_GAP"
  | "STYLE";

// Sentence plan
export type SentenceRole =
  | "topic"
  | "support"
  | "contrast"
  | "transition"
  | "takeaway";
export type HedgeLevel = "low" | "medium" | "high";

export interface SentencePlan {
  section: SectionType;
  sentenceRole: SentenceRole;
  claimCardIds: string[];
  citationPaperIds: string[];
  constraints: {
    tense?: string;
    journalStyle?: string;
    hedgeLevel?: HedgeLevel;
  };
}

// API request/response types
export interface EvidenceDiscoverRequest {
  documentId: string;
  query: string;
  section: SectionType;
  fieldHint?: FieldHint;
  dateRange?: { from?: string; to?: string };
  allowPreprints?: boolean;
}

export interface EvidenceDiscoverResponse {
  candidates: PaperCandidate[];
  searchIntent: SearchIntent;
  agentRunId: string;
}

export interface EvidenceVerifyRequest {
  paperId?: string; // existing CanonicalPaper id
  candidate?: PaperCandidate; // or a new candidate to verify
  targetClaim?: string;
}

export interface EvidenceVerifyResponse {
  paper: {
    id: string;
    title: string;
    year?: number;
    identifiers: Record<string, string>;
    verified: boolean;
  };
  evidenceSnippets: {
    id: string;
    text: string;
    sourceType: EvidenceTier;
  }[];
  claimCards: {
    id: string;
    claim: NormalizedClaim;
    supportLabel: SupportLabel;
    confidence: number;
  }[];
}
