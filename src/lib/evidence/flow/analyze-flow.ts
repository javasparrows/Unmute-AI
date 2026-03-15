import { translationModel } from "@/lib/gemini";
import { generateObject } from "ai";
import { z } from "zod";
import type { ParagraphFlowResult } from "./types";

interface AnalyzeFlowInput {
  sectionType: string;
  paragraphs: string[];
  researchTopic?: string;
  resultsSummary?: string;
}

const EXPECTED_ROLE_SEQUENCES: Record<string, string[]> = {
  INTRODUCTION: ["background", "problem", "prior_work", "gap", "approach", "contribution"],
  METHODS: ["approach", "prior_work", "contribution"],
  RESULTS: ["result", "interpretation"],
  DISCUSSION: ["interpretation", "prior_work", "limitation", "contribution"],
};

const flowAnalysisSchema = z.object({
  paragraphs: z.array(z.object({
    index: z.number(),
    role: z.enum([
      "background", "problem", "prior_work", "gap", "approach",
      "contribution", "result", "interpretation", "limitation",
      "transition", "other",
    ]),
    topics: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    transitionQuality: z.number().min(0).max(1),
    transitionNote: z.string(),
  })),
  issues: z.array(z.object({
    type: z.enum([
      "topic_shift", "missing_bridge", "redundant", "wrong_section",
      "missing_literature", "logical_gap", "role_sequence", "overlong_paragraph",
    ]),
    paragraphIndex: z.number(),
    severity: z.enum(["high", "medium", "low"]),
    description: z.string(),
    suggestion: z.string(),
    missingTopics: z.array(z.string()).optional(),
    relatedParagraph: z.number().optional(),
    expectedRole: z.enum([
      "background", "problem", "prior_work", "gap", "approach",
      "contribution", "result", "interpretation", "limitation",
      "transition", "other",
    ]).optional(),
  })),
  overallScore: z.number().min(0).max(100),
  sectionSummary: z.string(),
});

export async function analyzeFlow(input: AnalyzeFlowInput): Promise<ParagraphFlowResult> {
  const { sectionType, paragraphs, researchTopic, resultsSummary } = input;

  const numberedParagraphs = paragraphs
    .map((p, i) => `[Paragraph ${i}]\n${p}`)
    .join("\n\n---\n\n");

  const expectedSequence = EXPECTED_ROLE_SEQUENCES[sectionType] ?? [];

  const { object } = await generateObject({
    model: translationModel,
    schema: flowAnalysisSchema,
    prompt: `You are an expert academic writing coach analyzing the logical flow of a ${sectionType} section in a medical AI research paper.

${researchTopic ? `RESEARCH TOPIC: ${researchTopic}` : ""}
${resultsSummary ? `KEY RESULTS: ${resultsSummary}` : ""}

EXPECTED PARAGRAPH ROLE SEQUENCE FOR ${sectionType}:
${expectedSequence.join(" → ")}

PARAGRAPHS TO ANALYZE:
${numberedParagraphs}

INSTRUCTIONS:
For each paragraph:
1. Identify its role: background (general context), problem (specific problem being addressed), prior_work (literature review), gap (what's missing), approach (proposed method), contribution (what this paper adds), result (findings), interpretation (discussion of results), limitation (study limitations), transition (bridge paragraph), other
2. List key topics discussed (2-5 topic phrases)
3. Rate confidence in your role assignment (0.0-1.0)
4. Rate transition quality from the previous paragraph (0.0-1.0, first paragraph = 1.0)
5. Describe how this paragraph connects to the previous one

Then identify structural issues:
- topic_shift: Abrupt topic change without bridge (e.g., discussing Japanese NLP then suddenly switching to general LLM architecture)
- missing_bridge: Gap between paragraphs that needs a connecting sentence
- redundant: Paragraph repeats content from another paragraph
- wrong_section: Content belongs in a different section (e.g., interpretation in Results)
- missing_literature: Important related literature area is not covered (specify which topics are missing)
- logical_gap: The argument skips a logical step
- role_sequence: Paragraph role doesn't fit the expected sequence for this section type
- overlong_paragraph: Paragraph is too long (>300 words) and should be split

For each issue, provide:
- severity (high/medium/low)
- clear description of the problem
- actionable suggestion for fixing it
- for missing_literature: specify the missing topic areas
- for topic_shift: specify which paragraph it should connect to

Finally, provide an overall score (0-100) and a 1-2 sentence summary of the section's quality.`,
  });

  const roleSequence = object.paragraphs.map((p) => p.role).join(" → ");

  return {
    paragraphs: object.paragraphs.map((p) => ({
      ...p,
      textPreview: paragraphs[p.index]?.slice(0, 200) ?? "",
    })),
    issues: object.issues,
    overallScore: object.overallScore,
    sectionSummary: object.sectionSummary,
    roleSequence,
    expectedSequence: expectedSequence.join(" → "),
  };
}
