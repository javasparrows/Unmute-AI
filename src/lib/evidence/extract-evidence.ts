import { prisma } from "@/lib/prisma";
import { translationModel } from "@/lib/gemini";
import { generateObject } from "ai";
import { z } from "zod";
import {
  resolveFullText,
  getEvidenceTier,
} from "@/lib/providers/fulltext-resolver";
import type { PaperSection } from "@/lib/providers/types";

interface ExtractEvidenceParams {
  canonicalPaperId: string;
  targetClaim?: string;
}

interface ExtractEvidenceResult {
  snippets: { id: string; text: string; sectionType: string }[];
  claimCards: {
    id: string;
    subject: string;
    relation: string;
    object: string;
    supportLabel: string;
    confidence: number;
    evidenceTier: string;
  }[];
}

/**
 * Extract evidence snippets and claim cards from a canonical paper.
 *
 * 1. Resolves full text via the cascading provider strategy
 * 2. Uses Gemini to extract verbatim evidence snippets
 * 3. Creates atomic ClaimCards evaluated against the target claim
 * 4. Persists everything in the database with proper evidence links
 */
export async function extractEvidence(
  params: ExtractEvidenceParams,
): Promise<ExtractEvidenceResult> {
  const { canonicalPaperId, targetClaim } = params;

  // 1. Fetch paper with identifiers
  const paper = await prisma.canonicalPaper.findUnique({
    where: { id: canonicalPaperId },
    include: { identifiers: true },
  });
  if (!paper) throw new Error("Paper not found");

  // Build identifier object for full-text resolution
  const identifiers: Record<string, string | undefined> = {};
  for (const id of paper.identifiers) {
    if (id.provider === "crossref") identifiers.doi = id.externalId;
    if (id.provider === "pubmed") identifiers.pmid = id.externalId;
    if (id.provider === "pmc") identifiers.pmcid = id.externalId;
    if (id.provider === "arxiv") identifiers.arxivId = id.externalId;
  }

  // 2. Resolve full text via cascading provider fallback
  const fullText = await resolveFullText(identifiers);
  const sections: PaperSection[] = fullText?.sections ?? [];

  // Fallback: use abstract from paper record when no sections available
  if (sections.length === 0 && paper.abstract) {
    sections.push({
      heading: "Abstract",
      sectionType: "ABSTRACT",
      text: paper.abstract,
    });
  }

  if (sections.length === 0) {
    return { snippets: [], claimCards: [] };
  }

  const evidenceTier = fullText ? getEvidenceTier(fullText) : "ABSTRACT_ONLY";

  // 3. Extract evidence snippets using Gemini
  const sectionTexts = sections
    .map((s) => `[${s.heading}]\n${s.text}`)
    .join("\n\n---\n\n");

  const extractionPrompt = targetClaim
    ? `Extract evidence snippets from this paper that are relevant to the following claim: "${targetClaim}"\n\nPaper sections:\n${sectionTexts}`
    : `Extract the key findings, methods, and claims from this paper as evidence snippets.\n\nPaper sections:\n${sectionTexts}`;

  const ABSTRACT_ONLY_CONFIDENCE_CAP = 0.75;

  const { object: extracted } = await generateObject({
    model: translationModel,
    schema: z.object({
      snippets: z.array(
        z.object({
          text: z
            .string()
            .describe(
              "The exact text from the paper that serves as evidence",
            ),
          sectionType: z.enum([
            "INTRODUCTION",
            "METHODS",
            "RESULTS",
            "DISCUSSION",
            "ABSTRACT",
            "CONCLUSION",
            "OTHER",
          ]),
          heading: z
            .string()
            .describe("The section heading this snippet comes from"),
        }),
      ),
      claims: z.array(
        z.object({
          subject: z
            .string()
            .describe(
              "The subject of the claim (e.g., 'deep learning model')",
            ),
          relation: z
            .string()
            .describe(
              "The relation (e.g., 'achieves', 'outperforms', 'reduces')",
            ),
          object: z
            .string()
            .describe(
              "The object (e.g., '95% accuracy', 'baseline by 10%')",
            ),
          polarity: z.enum(["positive", "negative", "neutral"]),
          supportLabel: z.enum([
            "SUPPORTED",
            "PARTIAL",
            "CONTRADICTED",
            "INSUFFICIENT",
          ]),
          confidence: z.number().min(0).max(1),
          evidenceSnippetIndices: z
            .array(z.number())
            .describe("Indices into the snippets array"),
        }),
      ),
    }),
    system: `You are an expert academic evidence extractor. Your task is to:
1. Extract verbatim or near-verbatim evidence snippets from the paper text
2. Identify the key claims made in the paper
3. For each claim, specify which snippets support it and your confidence level

Rules:
- Snippets should be direct quotes or very close paraphrases from the paper
- Claims should be atomic (one subject-relation-object per claim)
- Confidence should be 0.85+ for clear, unambiguous claims; 0.65-0.84 for somewhat ambiguous; <0.65 for uncertain
- supportLabel: SUPPORTED if the snippet clearly supports the claim, PARTIAL if partially, CONTRADICTED if it contradicts, INSUFFICIENT if not enough evidence
- If the paper only has an abstract, be conservative with confidence scores (max ${ABSTRACT_ONLY_CONFIDENCE_CAP} for abstract-only)`,
    prompt: extractionPrompt,
  });

  // 4. Store snippets in database
  const createdSnippets = await Promise.all(
    extracted.snippets.map((snippet) =>
      prisma.evidenceSnippet.create({
        data: {
          paperId: canonicalPaperId,
          sourceType: evidenceTier,
          sectionLabel: snippet.heading,
          text: snippet.text,
        },
      }),
    ),
  );

  // 5. Store claim cards with evidence links
  const createdClaimCards = await Promise.all(
    extracted.claims.map(async (claim) => {
      // Apply abstract-only confidence cap
      const adjustedConfidence =
        evidenceTier === "ABSTRACT_ONLY"
          ? Math.min(claim.confidence, ABSTRACT_ONLY_CONFIDENCE_CAP)
          : claim.confidence;

      const claimCard = await prisma.claimCard.create({
        data: {
          paperId: canonicalPaperId,
          subject: claim.subject,
          relation: claim.relation,
          object: claim.object,
          polarity: claim.polarity,
          supportLabel: claim.supportLabel,
          evidenceTier,
          confidence: adjustedConfidence,
          evidence: {
            create: claim.evidenceSnippetIndices
              .filter((i) => i < createdSnippets.length)
              .map((i) => ({
                snippetId: createdSnippets[i].id,
              })),
          },
        },
      });

      return claimCard;
    }),
  );

  return {
    snippets: createdSnippets.map((s) => ({
      id: s.id,
      text: s.text,
      sectionType: s.sectionLabel ?? "OTHER",
    })),
    claimCards: createdClaimCards.map((c) => ({
      id: c.id,
      subject: c.subject,
      relation: c.relation,
      object: c.object,
      supportLabel: c.supportLabel,
      confidence: c.confidence,
      evidenceTier: c.evidenceTier,
    })),
  };
}
