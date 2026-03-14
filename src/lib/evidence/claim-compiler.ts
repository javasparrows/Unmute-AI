import { translationModel } from "@/lib/gemini";
import { generateObject } from "ai";
import { z } from "zod";

interface ClaimCoverageResult {
  sentences: {
    index: number;
    text: string;
    claims: {
      text: string;
      covered: boolean;
      coveringClaimCardId?: string;
      confidence?: number;
    }[];
    status: "GROUNDED" | "PARTIAL" | "UNSUPPORTED";
  }[];
  overallCoverage: number;
  gaps: {
    sentenceIndex: number;
    missingClaim: string;
  }[];
}

interface ClaimCardSummary {
  id: string;
  subject: string;
  relation: string;
  object: string;
  supportLabel: string;
  confidence: number;
}

const MATCH_CONFIDENCE_THRESHOLD = 0.65;

/**
 * Compile claims from a draft text and check coverage against available ClaimCards.
 *
 * 1. Decomposes the draft into sentences and atomic claims
 * 2. Identifies which claims require citations (factual vs common knowledge)
 * 3. Matches citation-requiring claims against available ClaimCards
 * 4. Returns per-sentence grounding status and coverage gaps
 */
export async function compileClaims(
  draftText: string,
  availableClaimCards: ClaimCardSummary[],
): Promise<ClaimCoverageResult> {
  // 1. Decompose draft into sentences and atomic claims
  const { object: decomposition } = await generateObject({
    model: translationModel,
    schema: z.object({
      sentences: z.array(
        z.object({
          index: z.number(),
          text: z.string(),
          claims: z.array(
            z.object({
              text: z
                .string()
                .describe("An atomic claim made in this sentence"),
              needsCitation: z
                .boolean()
                .describe(
                  "Whether this claim requires a citation (factual claims about literature need citations; general knowledge does not)",
                ),
            }),
          ),
        }),
      ),
    }),
    system: `You are an academic claim decomposition expert. Break the following text into sentences, and for each sentence, identify the atomic claims being made.

A claim needs a citation if it:
- States a finding from prior research
- References specific data or statistics
- Makes a comparison to other work
- Asserts a fact that is not common knowledge

A claim does NOT need a citation if it:
- States the purpose of the current paper
- Describes the current paper's own methodology
- Is common knowledge in the field
- Is a transition or structural sentence`,
    prompt: draftText,
  });

  // 2. Collect claims that need citations
  const claimsNeedingCitation = decomposition.sentences.flatMap((s) =>
    s.claims
      .filter((c) => c.needsCitation)
      .map((c) => ({
        sentenceIndex: s.index,
        claimText: c.text,
      })),
  );

  // If no claims need citations, everything is grounded
  if (claimsNeedingCitation.length === 0) {
    return {
      sentences: decomposition.sentences.map((s) => ({
        index: s.index,
        text: s.text,
        claims: s.claims.map((c) => ({
          text: c.text,
          covered: !c.needsCitation,
        })),
        status: "GROUNDED" as const,
      })),
      overallCoverage: 1.0,
      gaps: [],
    };
  }

  // 3. Match each claim against available ClaimCards
  const claimCardDescriptions = availableClaimCards
    .map(
      (cc) =>
        `[${cc.id}] ${cc.subject} ${cc.relation} ${cc.object} (${cc.supportLabel}, confidence: ${cc.confidence})`,
    )
    .join("\n");

  const { object: matching } = await generateObject({
    model: translationModel,
    schema: z.object({
      matches: z.array(
        z.object({
          sentenceIndex: z.number(),
          claimText: z.string(),
          matchedClaimCardId: z
            .string()
            .nullable()
            .describe(
              "The ID of the matching ClaimCard, or null if no match",
            ),
          matchConfidence: z.number().min(0).max(1),
        }),
      ),
    }),
    system: `You are a claim-evidence matching expert. For each claim that needs a citation, find the best matching ClaimCard from the available evidence.

Available ClaimCards:
${claimCardDescriptions}

Rules:
- Only match if the ClaimCard genuinely supports the claim being made
- matchConfidence should reflect how well the ClaimCard covers the specific claim
- Set matchedClaimCardId to null if no ClaimCard adequately covers the claim
- Be strict: partial matches should have lower confidence`,
    prompt: JSON.stringify(claimsNeedingCitation),
  });

  // 4. Build coverage result
  const gaps: { sentenceIndex: number; missingClaim: string }[] = [];

  const sentences = decomposition.sentences.map((s) => {
    const sentenceClaims = s.claims.map((claim) => {
      if (!claim.needsCitation) {
        return { text: claim.text, covered: true };
      }

      const match = matching.matches.find(
        (m) => m.sentenceIndex === s.index && m.claimText === claim.text,
      );

      const covered =
        match?.matchedClaimCardId != null &&
        (match?.matchConfidence ?? 0) >= MATCH_CONFIDENCE_THRESHOLD;

      if (!covered) {
        gaps.push({ sentenceIndex: s.index, missingClaim: claim.text });
      }

      return {
        text: claim.text,
        covered,
        coveringClaimCardId: match?.matchedClaimCardId ?? undefined,
        confidence: match?.matchConfidence,
      };
    });

    const citationClaims = sentenceClaims.filter(
      (c) =>
        s.claims.find((sc) => sc.text === c.text)?.needsCitation ?? false,
    );
    const allCovered =
      citationClaims.length === 0 || citationClaims.every((c) => c.covered);
    const someCovered = citationClaims.some((c) => c.covered);

    return {
      index: s.index,
      text: s.text,
      claims: sentenceClaims,
      status: (allCovered
        ? "GROUNDED"
        : someCovered
          ? "PARTIAL"
          : "UNSUPPORTED") as "GROUNDED" | "PARTIAL" | "UNSUPPORTED",
    };
  });

  const totalCitationClaims = sentences.flatMap((s) =>
    s.claims.filter((c) => {
      const original = decomposition.sentences
        .find((ds) => ds.index === s.index)
        ?.claims.find((dc) => dc.text === c.text);
      return original?.needsCitation;
    }),
  );
  const coveredCount = totalCitationClaims.filter((c) => c.covered).length;
  const overallCoverage =
    totalCitationClaims.length > 0
      ? coveredCount / totalCitationClaims.length
      : 1.0;

  return { sentences, overallCoverage, gaps };
}
