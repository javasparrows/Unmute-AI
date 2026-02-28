import { generateText } from "ai";
import type { LanguageCode } from "@/types";
import { translationModel } from "./gemini";
import { buildSentenceTranslationPrompt } from "./prompts";

export interface GeminiTranslationResult {
  translations: string[];
  inputTokens: number;
  outputTokens: number;
}

export async function translateWithGemini(params: {
  texts: string[];
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  journalId?: string;
}): Promise<GeminiTranslationResult> {
  if (params.texts.length === 0) {
    return { translations: [], inputTokens: 0, outputTokens: 0 };
  }

  const { system, user } = buildSentenceTranslationPrompt(
    params.texts,
    params.sourceLang,
    params.targetLang,
    params.journalId,
  );

  const result = await generateText({
    model: translationModel,
    system,
    prompt: user,
  });

  const parsed = JSON.parse(result.text) as string[];

  if (!Array.isArray(parsed) || parsed.length !== params.texts.length) {
    throw new Error(
      `Gemini returned ${Array.isArray(parsed) ? parsed.length : "non-array"} items, expected ${params.texts.length}`,
    );
  }

  return {
    translations: parsed,
    inputTokens: result.usage.inputTokens ?? 0,
    outputTokens: result.usage.outputTokens ?? 0,
  };
}
