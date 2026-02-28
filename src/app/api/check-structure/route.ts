import { generateText } from "ai";
import { translationModel } from "@/lib/gemini";
import { buildStructureCheckPrompt } from "@/lib/prompts";
import type { LanguageCode, StructureCheckResult } from "@/types";

export async function POST(request: Request) {
  const body = (await request.json()) as { text: string; lang: LanguageCode };
  const { text, lang } = body;

  if (!text?.trim()) {
    return Response.json(
      { error: "No text provided" },
      { status: 400 },
    );
  }

  const { text: result } = await generateText({
    model: translationModel,
    system: buildStructureCheckPrompt(lang),
    prompt: text,
  });

  try {
    const parsed = JSON.parse(result) as StructureCheckResult;
    return Response.json(parsed);
  } catch {
    return Response.json(
      { error: "Failed to parse structure check result" },
      { status: 500 },
    );
  }
}
