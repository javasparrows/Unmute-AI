export type ParagraphRoleType =
  | "background"
  | "problem"
  | "prior_work"
  | "gap"
  | "approach"
  | "contribution"
  | "result"
  | "interpretation"
  | "limitation"
  | "transition"
  | "other";

export interface ParagraphRole {
  index: number;
  textPreview: string;
  role: ParagraphRoleType;
  topics: string[];
  confidence: number;
  transitionQuality: number;
  transitionNote: string;
}

export type FlowIssueType =
  | "topic_shift"
  | "missing_bridge"
  | "redundant"
  | "wrong_section"
  | "missing_literature"
  | "logical_gap"
  | "role_sequence"
  | "overlong_paragraph";

export interface FlowIssue {
  type: FlowIssueType;
  paragraphIndex: number;
  severity: "high" | "medium" | "low";
  description: string;
  suggestion: string;
  missingTopics?: string[];
  relatedParagraph?: number;
  expectedRole?: ParagraphRoleType;
}

export interface ParagraphFlowResult {
  paragraphs: ParagraphRole[];
  issues: FlowIssue[];
  overallScore: number;
  sectionSummary: string;
  roleSequence: string;
  expectedSequence: string;
}
