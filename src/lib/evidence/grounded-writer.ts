import { translationModel } from "@/lib/gemini";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import type { SectionType, SentencePlan } from "@/types/evidence";

interface ClaimCardForWriting {
  id: string;
  paperId: string;
  paperTitle: string;
  paperYear?: number;
  paperAuthors?: string;
  subject: string;
  relation: string;
  object: string;
  polarity: string;
  supportLabel: string;
  confidence: number;
  evidenceTier: string;
  citeKey?: string; // e.g., "Smith et al., 2024"
}

interface GroundedWriteRequest {
  section: SectionType;
  userIntent: string; // What the user wants to say (can be in any language)
  claimCards: ClaimCardForWriting[];
  targetLanguage: string; // "en", "ja", etc.
  journalId?: string;
  existingContext?: string; // preceding text for coherence
}

interface GroundedWriteResult {
  sentencePlans: SentencePlan[];
  draftText: string;
  citations: { paperId: string; citeKey: string; claimCardIds: string[] }[];
  warnings: string[];
}

/**
 * Generate grounded academic prose from approved ClaimCards only.
 *
 * Two-stage process:
 * 1. Create SentencePlans from ClaimCards (what to say, in what order, with what hedge level)
 * 2. Realize prose from SentencePlans (actual academic writing)
 *
 * Core rule: "No source, no claim" -- claims without ClaimCards are never written.
 */
export async function generateGroundedDraft(
  request: GroundedWriteRequest,
): Promise<GroundedWriteResult> {
  const {
    section,
    userIntent,
    claimCards,
    targetLanguage,
    journalId,
    existingContext,
  } = request;

  if (claimCards.length === 0) {
    return {
      sentencePlans: [],
      draftText: "",
      citations: [],
      warnings: [
        "No approved ClaimCards available. Please search and verify citations first.",
      ],
    };
  }

  // Build claim card descriptions for the LLM
  const claimDescriptions = claimCards
    .map(
      (cc) =>
        `[${cc.id}] "${cc.subject} ${cc.relation} ${cc.object}" (${cc.polarity}, ${cc.supportLabel}, confidence: ${cc.confidence}, tier: ${cc.evidenceTier}) — Source: ${cc.citeKey || cc.paperTitle}`,
    )
    .join("\n");

  // Get journal style if specified
  let journalStyle = "";
  if (journalId) {
    try {
      const { getJournal } = await import("@/lib/journals");
      const journal = getJournal(journalId);
      journalStyle = `\nJournal style: ${journal.name}\n${journal.styleGuide}`;
    } catch {
      // Journal not found, continue without style
    }
  }

  // Stage 1: Generate SentencePlans
  const { object: plans } = await generateObject({
    model: translationModel,
    schema: z.object({
      sentencePlans: z.array(
        z.object({
          sentenceRole: z.enum([
            "topic",
            "support",
            "contrast",
            "transition",
            "takeaway",
          ]),
          claimCardIds: z.array(z.string()),
          citationPaperIds: z.array(z.string()),
          hedgeLevel: z.enum(["low", "medium", "high"]),
          outline: z
            .string()
            .describe("Brief outline of what this sentence will say"),
        }),
      ),
      warnings: z
        .array(z.string())
        .describe(
          "Any concerns about evidence gaps or weak coverage",
        ),
    }),
    system: `You are an academic writing planner. Create a sentence-by-sentence plan for a ${section} section paragraph.

RULES:
- Every sentence that makes a literature claim MUST reference at least one ClaimCard by ID
- Use "topic" for opening statements, "support" for evidence sentences, "contrast" for counter-evidence, "transition" for flow, "takeaway" for conclusions
- hedgeLevel: "low" for strong evidence (confidence >= 0.85), "medium" for moderate (0.65-0.84), "high" for weak/abstract-only evidence
- If a claim the user wants to make has no supporting ClaimCard, add a warning instead of including it
- For ${section}: ${getSectionRules(section)}
${journalStyle}

Available ClaimCards:
${claimDescriptions}`,
    prompt: `User intent: ${userIntent}${existingContext ? `\n\nPreceding context:\n${existingContext}` : ""}`,
  });

  // Stage 2: Generate prose from SentencePlans
  const planDescription = plans.sentencePlans
    .map(
      (p, i) =>
        `Sentence ${i + 1} [${p.sentenceRole}]: ${p.outline} (Claims: ${p.claimCardIds.join(", ")}, Hedge: ${p.hedgeLevel})`,
    )
    .join("\n");

  // Build citation mapping
  const citationMap = new Map<string, ClaimCardForWriting>();
  for (const cc of claimCards) {
    citationMap.set(cc.id, cc);
  }

  const citeKeyMap = new Map<string, string>();
  for (const cc of claimCards) {
    if (!citeKeyMap.has(cc.paperId)) {
      citeKeyMap.set(
        cc.paperId,
        cc.citeKey ||
          `[${cc.paperAuthors || "Unknown"}, ${cc.paperYear || "n.d."}]`,
      );
    }
  }

  const { text: draftText } = await generateText({
    model: translationModel,
    system: `You are an expert academic writer. Write polished academic prose in ${targetLanguage} based on the sentence plan below.

CRITICAL RULES:
1. Every literature claim MUST include an inline citation in the format [CiteKey]
2. Use hedging language appropriate to the hedge level:
   - low: direct statements ("X demonstrates that...", "Research has shown...")
   - medium: moderate hedging ("X suggests that...", "Evidence indicates...")
   - high: cautious hedging ("X may suggest...", "Preliminary evidence points to...")
3. Do NOT make any claims not covered by the sentence plan
4. Maintain smooth transitions between sentences
5. Match the academic tone and style of the target section (${section})
${journalStyle}

Citation keys:
${Array.from(citeKeyMap.entries())
  .map(([pid, key]) => `${pid}: ${key}`)
  .join("\n")}`,
    prompt: `Write the paragraph based on this plan:\n${planDescription}`,
  });

  // Build citation list
  const usedPaperIds = new Set<string>();
  const citations: {
    paperId: string;
    citeKey: string;
    claimCardIds: string[];
  }[] = [];

  for (const plan of plans.sentencePlans) {
    for (const ccId of plan.claimCardIds) {
      const cc = citationMap.get(ccId);
      if (cc && !usedPaperIds.has(cc.paperId)) {
        usedPaperIds.add(cc.paperId);
        const relatedCardIds = claimCards
          .filter((c) => c.paperId === cc.paperId)
          .map((c) => c.id);
        citations.push({
          paperId: cc.paperId,
          citeKey: citeKeyMap.get(cc.paperId) || cc.paperTitle,
          claimCardIds: relatedCardIds,
        });
      }
    }
  }

  const sentencePlans: SentencePlan[] = plans.sentencePlans.map((p) => ({
    section,
    sentenceRole: p.sentenceRole,
    claimCardIds: p.claimCardIds,
    citationPaperIds: p.citationPaperIds,
    constraints: {
      journalStyle: journalId,
      hedgeLevel: p.hedgeLevel,
    },
  }));

  return {
    sentencePlans,
    draftText,
    citations,
    warnings: plans.warnings,
  };
}

function getSectionRules(section: SectionType): string {
  switch (section) {
    case "INTRODUCTION":
      return "Only use verified literature claims. Field statements require landmark + recent review citations. Do not reference the current study's results.";
    case "METHODS":
      return "Reference verified method papers for established techniques. Do not invent procedures or parameters. User-provided protocol descriptions are allowed without citation.";
    case "RESULTS":
      return "Literature citations only for comparison sentences. Primary claims must come from user data/artifacts, not from ClaimCards.";
    case "DISCUSSION":
      return "Present both supporting AND contradicting literature. Compare findings with prior work. Include limitations where evidence is weak.";
    default:
      return "";
  }
}
