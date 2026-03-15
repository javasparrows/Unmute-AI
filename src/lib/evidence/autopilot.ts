import { translationModel } from "@/lib/gemini";
import { generateObject } from "ai";
import { z } from "zod";
import { searchAllProviders } from "@/lib/providers";
import type { PaperCandidate, SectionType } from "@/types/evidence";

export type SentenceNeedStatus =
  | "NEEDS_CITATION"
  | "NO_CITATION"
  | "ALREADY_CITED";

export interface AnalyzedSentence {
  index: number;
  text: string;
  status: SentenceNeedStatus;
  reason?: string;
}

export interface AutopilotAnalysis {
  sentences: AnalyzedSentence[];
  totalSentences: number;
  needsCitation: number;
  alreadyCited: number;
  noCitation: number;
}

/**
 * Analyze all sentences in a text to determine citation needs.
 */
export async function analyzeForCitations(
  text: string,
  section: SectionType
): Promise<AutopilotAnalysis> {
  const { object } = await generateObject({
    model: translationModel,
    schema: z.object({
      sentences: z.array(
        z.object({
          index: z.number(),
          text: z.string(),
          status: z.enum(["NEEDS_CITATION", "NO_CITATION", "ALREADY_CITED"]),
          reason: z
            .string()
            .optional()
            .describe("Brief reason for classification"),
        })
      ),
    }),
    system: `You are an academic citation expert. Analyze each sentence and classify whether it needs a citation.

NEEDS_CITATION if the sentence:
- States a finding from prior research
- References specific data, statistics, or measurements from other work
- Makes a claim about the state of the field
- Compares with or references other methods/approaches
- States a fact that is not common knowledge

NO_CITATION if the sentence:
- States the purpose/goal of the current paper ("In this study, we...")
- Describes the current paper's own methodology or results
- Is common knowledge in the field
- Is a transition, structural, or summary sentence
- Is a general statement anyone in the field would agree with

ALREADY_CITED if the sentence:
- Already contains \\cite{}, [1], (Author, Year), or similar citation markers

Section: ${section}
Section-specific rules:
${section === "INTRODUCTION" ? "Most background claims need citations. Field overview statements need landmark papers." : ""}
${section === "METHODS" ? "Established methods need original method paper citations. Own procedure descriptions do not." : ""}
${section === "RESULTS" ? "Own findings do not need citations. Comparisons with prior work do." : ""}
${section === "DISCUSSION" ? "Comparisons with prior work need citations. Own interpretations do not." : ""}`,
    prompt: text,
  });

  const needsCitation = object.sentences.filter(
    (s) => s.status === "NEEDS_CITATION"
  ).length;
  const alreadyCited = object.sentences.filter(
    (s) => s.status === "ALREADY_CITED"
  ).length;
  const noCitation = object.sentences.filter(
    (s) => s.status === "NO_CITATION"
  ).length;

  return {
    sentences: object.sentences,
    totalSentences: object.sentences.length,
    needsCitation,
    alreadyCited,
    noCitation,
  };
}

/**
 * Suggest candidate papers for a specific sentence.
 * Uses the sentence text to generate a search query and fetch from providers.
 */
export async function suggestCitations(
  sentenceText: string,
  section: SectionType,
  _existingCiteKeys: string[] = []
): Promise<{ candidates: PaperCandidate[]; searchQuery: string }> {
  // Generate optimized search query from the sentence
  const { object: queryPlan } = await generateObject({
    model: translationModel,
    schema: z.object({
      searchQuery: z
        .string()
        .describe(
          "Optimized English search query for finding papers relevant to this sentence"
        ),
      queryVariants: z.array(z.string()).max(3),
    }),
    system: `You are a scholarly search expert. Given a sentence from a ${section} section that needs a citation, generate an optimized English search query to find the most relevant supporting papers.

Focus on:
- Key concepts and technical terms
- Specific claims or findings mentioned
- Methodological approaches referenced

Keep queries concise (5-10 words). Generate 1-3 variants.`,
    prompt: sentenceText,
  });

  // Search across all providers
  const allQueries = [queryPlan.searchQuery, ...queryPlan.queryVariants];
  const allResults: PaperCandidate[] = [];

  const searchResults = await Promise.allSettled(
    allQueries.map((q) => searchAllProviders(q, { maxResults: 10 }))
  );

  for (const result of searchResults) {
    if (result.status === "fulfilled") {
      allResults.push(...result.value);
    }
  }

  // Deduplicate
  const seen = new Map<string, PaperCandidate>();
  for (const paper of allResults) {
    const key =
      paper.externalIds?.doi ??
      paper.title
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 50);
    if (key && !seen.has(key)) seen.set(key, paper);
  }

  // Sort by relevance (citation count + recency)
  const candidates = Array.from(seen.values()).sort((a, b) => {
    const scoreA = computeScore(a);
    const scoreB = computeScore(b);
    return scoreB - scoreA;
  });

  return {
    candidates: candidates.slice(0, 5),
    searchQuery: queryPlan.searchQuery,
  };
}

function computeScore(paper: PaperCandidate): number {
  const currentYear = new Date().getFullYear();
  const citationCount = paper.citationCount ?? 0;
  const citationScore =
    citationCount > 0 ? Math.log10(citationCount + 1) / 5 : 0;
  const year = paper.year ?? currentYear - 10;
  const age = currentYear - year;
  const recencyScore =
    age <= 3 ? 1.0 : age <= 5 ? 0.7 : age <= 10 ? 0.4 : 0.2;
  const providerScore = paper.relevanceScore ?? 0.5;
  const abstractScore = paper.abstract ? 1.0 : 0.0;
  return (
    0.4 * citationScore +
    0.3 * Math.min(providerScore, 1.0) +
    0.2 * recencyScore +
    0.1 * abstractScore
  );
}
