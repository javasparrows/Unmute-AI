import { generateText } from "ai";
import { translationModel } from "@/lib/gemini";
import { buildStructureCheckPrompt } from "@/lib/prompts";
import { auth } from "@/lib/auth";
import { getUserPlanById } from "@/lib/user-plan";
import {
  checkStructureCheckLimit,
  recordStructureCheckUsage,
} from "@/app/actions/usage";
import type { LanguageCode, StructureCheckResult } from "@/types";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { text: string; lang: LanguageCode };
  const { text, lang } = body;

  if (!text?.trim()) {
    return Response.json(
      { error: "No text provided" },
      { status: 400 },
    );
  }

  const { plan } = await getUserPlanById(session.user.id);
  const limitCheck = await checkStructureCheckLimit(session.user.id, plan);
  if (!limitCheck.allowed) {
    return Response.json(
      {
        error: "構成チェックの上限に達しました",
        code: "STRUCTURE_CHECK_LIMIT",
        remaining: limitCheck.remaining,
      },
      { status: 429 },
    );
  }

  const { text: result } = await generateText({
    model: translationModel,
    system: buildStructureCheckPrompt(lang),
    prompt: text,
  });

  // Record usage after successful check
  await recordStructureCheckUsage(session.user.id);

  try {
    // Strip markdown code fences if present
    const cleaned = result
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as StructureCheckResult;
    return Response.json(parsed);
  } catch {
    return Response.json(
      { error: "Failed to parse structure check result", raw: result },
      { status: 500 },
    );
  }
}
