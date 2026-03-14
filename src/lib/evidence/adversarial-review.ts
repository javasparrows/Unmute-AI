import { translationModel } from "@/lib/gemini";
import { generateObject } from "ai";
import { z } from "zod";
import type { SectionType } from "@/types/evidence";

type ReviewSeverity = "BLOCKER" | "MAJOR" | "MINOR";
type ReviewType =
  | "UNSUPPORTED"
  | "MISATTRIBUTED"
  | "MISSING_KEY_PAPER"
  | "LOGIC_GAP"
  | "STYLE";

interface ReviewFindingResult {
  severity: ReviewSeverity;
  type: ReviewType;
  sentenceIndex?: number;
  explanation: string;
  suggestedFix?: string;
}

interface AdversarialReviewRequest {
  draftText: string;
  section: SectionType;
  claimCards: {
    id: string;
    subject: string;
    relation: string;
    object: string;
    supportLabel: string;
    confidence: number;
    evidenceTier: string;
    paperTitle: string;
  }[];
  coverageReport?: {
    overallCoverage: number;
    gaps: { sentenceIndex: number; missingClaim: string }[];
  };
}

interface AdversarialReviewResult {
  findings: ReviewFindingResult[];
  overallVerdict: "PASS" | "NEEDS_REVISION" | "BLOCKED";
  summary: string;
  humanApprovalRequired: boolean;
}

/**
 * Run an adversarial peer review on a draft text.
 *
 * The reviewer has BLOCK authority and checks for:
 * - Unsupported claims (factual claims without backing ClaimCards)
 * - Misattributed claims (citations that don't support the claim made)
 * - Missing key papers (landmark/review/guideline gaps)
 * - Logic gaps (non-sequiturs, missing transitions)
 * - Style issues (inappropriate hedging, causal language inflation)
 *
 * Returns findings with severity levels and an overall verdict.
 */
export async function runAdversarialReview(
  request: AdversarialReviewRequest,
): Promise<AdversarialReviewResult> {
  const { draftText, section, claimCards, coverageReport } = request;

  const claimDescriptions = claimCards
    .map(
      (cc) =>
        `[${cc.id}] "${cc.subject} ${cc.relation} ${cc.object}" (${cc.supportLabel}, confidence: ${cc.confidence}, tier: ${cc.evidenceTier}) — ${cc.paperTitle}`,
    )
    .join("\n");

  const coverageInfo = coverageReport
    ? `\nCoverage Report:\n- Overall coverage: ${(coverageReport.overallCoverage * 100).toFixed(0)}%\n- Gaps: ${coverageReport.gaps.map((g) => `Sentence ${g.sentenceIndex}: "${g.missingClaim}"`).join(", ") || "none"}`
    : "";

  const { object: review } = await generateObject({
    model: translationModel,
    schema: z.object({
      findings: z.array(
        z.object({
          severity: z.enum(["BLOCKER", "MAJOR", "MINOR"]),
          type: z.enum([
            "UNSUPPORTED",
            "MISATTRIBUTED",
            "MISSING_KEY_PAPER",
            "LOGIC_GAP",
            "STYLE",
          ]),
          sentenceIndex: z
            .number()
            .optional()
            .describe(
              "0-based index of the problematic sentence, if applicable",
            ),
          explanation: z.string(),
          suggestedFix: z.string().optional(),
        }),
      ),
      summary: z
        .string()
        .describe("Brief overall assessment of the draft quality"),
    }),
    system: `You are a strict academic peer reviewer with BLOCK authority. Review the following ${section} section draft against the available evidence.

CHECK FOR:
1. UNSUPPORTED claims: Sentences making factual claims without backing ClaimCards
2. MISATTRIBUTED claims: Citations that don't actually support the claim being made (check claim subject/relation/object against the citation)
3. MISSING_KEY_PAPER: Important gaps where a landmark paper, systematic review, or guideline should be cited but isn't
4. LOGIC_GAP: Logical inconsistencies, non-sequiturs, or missing transitions
5. STYLE: Inappropriate hedging (too strong for weak evidence, too weak for strong evidence), causal language inflation ("proves", "demonstrates conclusively" for weak evidence), vague quantifiers

SEVERITY RULES:
- BLOCKER: Unsupported factual claim, misattributed citation, or assertion contradicted by available evidence. Draft cannot proceed.
- MAJOR: Missing key reference, significant logic gap, or claim based on ABSTRACT_ONLY evidence presented as if from full text. Requires revision.
- MINOR: Style issues, hedging adjustments, transition improvements. Nice to fix but not blocking.

SECTION-SPECIFIC RULES for ${section}:
${getSectionReviewRules(section)}

Available ClaimCards (the ONLY valid evidence):
${claimDescriptions}
${coverageInfo}

Be thorough but fair. Flag real issues, not stylistic preferences.`,
    prompt: draftText,
  });

  // Determine overall verdict
  const hasBlocker = review.findings.some(
    (f) => f.severity === "BLOCKER",
  );
  const hasMajor = review.findings.some(
    (f) => f.severity === "MAJOR",
  );

  // Check if human approval is required
  const hasAbstractOnlyClaims = claimCards.some(
    (cc) =>
      cc.evidenceTier === "ABSTRACT_ONLY" && cc.confidence < 0.85,
  );
  const hasContradiction = claimCards.some(
    (cc) => cc.supportLabel === "CONTRADICTED",
  );
  const hasLowConfidence = claimCards.some(
    (cc) => cc.confidence < 0.65,
  );

  const humanApprovalRequired =
    hasAbstractOnlyClaims ||
    hasContradiction ||
    hasLowConfidence ||
    hasBlocker;

  return {
    findings: review.findings,
    overallVerdict: hasBlocker
      ? "BLOCKED"
      : hasMajor
        ? "NEEDS_REVISION"
        : "PASS",
    summary: review.summary,
    humanApprovalRequired,
  };
}

function getSectionReviewRules(section: SectionType): string {
  switch (section) {
    case "INTRODUCTION":
      return `- Every background claim needs a citation
- Field overview statements need landmark + recent review/systematic review
- Do not reference the current study's own results here
- Claims about prevalence, incidence, or statistics need specific citations`;
    case "METHODS":
      return `- Established methods need original method paper citations
- Do not accept invented parameters or procedures
- Software/tool citations should reference the correct version
- User-described protocols are acceptable without citation`;
    case "RESULTS":
      return `- Primary findings should NOT cite other papers (they come from the current study)
- Comparison with prior work is acceptable with proper citations
- Statistical claims need appropriate hedging
- Do not over-interpret results`;
    case "DISCUSSION":
      return `- Must address contradicting evidence, not just supporting
- Limitations should be acknowledged
- Speculation must be clearly hedged
- Comparison with prior work needs proper citations`;
    default:
      return "";
  }
}
