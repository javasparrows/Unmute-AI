import { translationModel } from "@/lib/gemini";
import { generateObject } from "ai";
import { z } from "zod";
import { getGuideline } from "./guideline-db";

export interface ComplianceItemResult {
  itemId: string;
  section: string;
  requirement: string;
  status: "met" | "partially_met" | "not_met" | "not_applicable";
  location: string | null;
  explanation: string;
  suggestion: string | null;
}

export interface ComplianceResult {
  guidelineId: string;
  guidelineName: string;
  results: ComplianceItemResult[];
  metCount: number;
  totalCount: number;
  score: number;
}

const complianceSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string(),
      status: z.enum(["met", "partially_met", "not_met", "not_applicable"]),
      location: z
        .string()
        .nullable()
        .describe("Which section/paragraph addresses this requirement"),
      explanation: z
        .string()
        .describe("Why this status was assigned"),
      suggestion: z
        .string()
        .nullable()
        .describe("How to improve compliance if not fully met"),
    }),
  ),
});

export async function checkCompliance(
  guidelineId: string,
  manuscriptText: string,
): Promise<ComplianceResult> {
  const guideline = getGuideline(guidelineId);
  if (!guideline) {
    throw new Error(`Unknown guideline: ${guidelineId}`);
  }

  const itemDescriptions = guideline.items
    .map(
      (item) =>
        `- ${item.id}: [${item.section}] ${item.requirement} (Keywords: ${item.keywords.join(", ")})`,
    )
    .join("\n");

  const { object } = await generateObject({
    model: translationModel,
    schema: complianceSchema,
    prompt: `You are an expert in medical AI reporting guidelines. Check this manuscript against the ${guideline.name} (${guideline.fullName}) checklist.

GUIDELINE: ${guideline.name} v${guideline.version}
PURPOSE: ${guideline.applicableDesigns.join(", ")}

CHECKLIST ITEMS:
${itemDescriptions}

MANUSCRIPT TEXT:
${manuscriptText}

INSTRUCTIONS:
For each checklist item, determine:
1. status: "met" (clearly addressed), "partially_met" (mentioned but incomplete), "not_met" (not found), or "not_applicable" (does not apply to this study)
2. location: Where in the manuscript this requirement is addressed (e.g., "Methods, paragraph 3")
3. explanation: Brief explanation of your assessment
4. suggestion: If not fully met, how to fix it (null if met or not_applicable)

Be strict but fair. Look for semantic matches, not just keywords.`,
  });

  const results: ComplianceItemResult[] = object.items.map((item) => {
    const def = guideline.items.find((d) => d.id === item.itemId);
    return {
      itemId: item.itemId,
      section: def?.section ?? "",
      requirement: def?.requirement ?? "",
      status: item.status,
      location: item.location,
      explanation: item.explanation,
      suggestion: item.suggestion,
    };
  });

  const applicable = results.filter((r) => r.status !== "not_applicable");
  const met = applicable.filter((r) => r.status === "met").length;
  const score =
    applicable.length > 0
      ? Math.round((met / applicable.length) * 100)
      : 100;

  return {
    guidelineId,
    guidelineName: guideline.name,
    results,
    metCount: met,
    totalCount: applicable.length,
    score,
  };
}
