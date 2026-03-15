import { translationModel } from "@/lib/gemini";
import { generateObject } from "ai";
import { z } from "zod";

const passageMatchSchema = z.object({
  supportingPassage: z
    .string()
    .describe(
      "The exact quoted text from the cited paper that supports the claim",
    ),
  citedPaperSection: z
    .string()
    .nullable()
    .describe(
      "The section heading where the passage is found (e.g., 'Results', 'Methods')",
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "How strongly this passage supports the claim: 0.0 = no support, 1.0 = direct evidence",
    ),
  rationale: z
    .string()
    .describe(
      "Brief explanation of why this passage supports the manuscript claim",
    ),
});

export interface PassageMatchResult {
  supportingPassage: string;
  citedPaperSection: string | null;
  confidence: number;
  rationale: string;
  citedPaperPage: number | null;
}

/**
 * Use Gemini to find the passage in a cited paper that supports a manuscript claim.
 */
export async function matchPassage(
  manuscriptSentence: string,
  citedPaperPages: { pageNumber: number; text: string }[],
  paperTitle: string,
): Promise<PassageMatchResult> {
  const fullText = citedPaperPages
    .map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`)
    .join("\n\n");

  const { object } = await generateObject({
    model: translationModel,
    schema: passageMatchSchema,
    prompt: `You are an academic evidence verification expert. Given a claim from a manuscript and the full text of a cited paper, find the specific passage in the cited paper that directly supports or substantiates the claim.

MANUSCRIPT CLAIM:
"${manuscriptSentence}"

CITED PAPER TITLE:
"${paperTitle}"

CITED PAPER FULL TEXT:
${fullText}

INSTRUCTIONS:
1. Find the most relevant passage in the cited paper that supports the manuscript claim
2. Quote the passage EXACTLY as it appears in the paper (do not paraphrase)
3. Identify which section of the paper the passage is from
4. Rate your confidence that this passage actually supports the claim (0.0-1.0)
5. Explain WHY this passage supports the claim

If no passage supports the claim, set confidence to 0.0 and explain why.`,
  });

  // Find which page the passage is on
  let citedPaperPage: number | null = null;
  for (const page of citedPaperPages) {
    if (page.text.includes(object.supportingPassage.slice(0, 50))) {
      citedPaperPage = page.pageNumber;
      break;
    }
  }

  return {
    supportingPassage: object.supportingPassage,
    citedPaperSection: object.citedPaperSection,
    confidence: object.confidence,
    rationale: object.rationale,
    citedPaperPage,
  };
}
