import { generateText } from "ai";
import type { LanguageCode, AlignedTranslationItem, AlignmentGroup } from "@/types";
import { translationModel } from "./gemini";
import { buildSentenceTranslationPrompt } from "./prompts";
import { buildAlignmentFromResponse } from "./alignment";

export interface GeminiTranslationResult {
  translations: string[];
  alignment: AlignmentGroup[];
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
    return { translations: [], alignment: [], inputTokens: 0, outputTokens: 0 };
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

  const parsed = JSON.parse(result.text) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Gemini returned non-array response");
  }

  let items: AlignedTranslationItem[];

  if (parsed.length > 0 && typeof parsed[0] === "string") {
    // Legacy format: string[] — wrap into {text, src}[] with 1:1 mapping
    const legacyArr = parsed as string[];
    items = legacyArr.map((text, i) => ({ text, src: [i] }));
  } else {
    // New format: {text, src}[]
    items = parsed as AlignedTranslationItem[];
    // Validate structure
    for (const item of items) {
      if (typeof item.text !== "string" || !Array.isArray(item.src)) {
        throw new Error("Invalid translation item format from Gemini");
      }
    }
  }

  const translations = items.map((item) => item.text);
  const alignment = buildAlignmentFromResponse(items);

  return {
    translations,
    alignment,
    inputTokens: result.usage.inputTokens ?? 0,
    outputTokens: result.usage.outputTokens ?? 0,
  };
}
