import { NextResponse } from "next/server";
import type {
  SentenceTranslationRequest,
  SentenceTranslationResponse,
  TranslationUsage,
} from "@/types";
import { translateWithDeepL } from "@/lib/deepl";
import { translateWithGemini } from "@/lib/gemini-translate";

export async function POST(request: Request) {
  try {
    const {
      sentences,
      sourceLang,
      targetLang,
      provider = "deepl",
      journal,
    } = (await request.json()) as SentenceTranslationRequest;

    if (!sentences || !sourceLang || !targetLang) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Filter out empty sentences, keep track of indices
    const nonEmptyIndices: number[] = [];
    const textsToTranslate: string[] = [];

    for (let i = 0; i < sentences.length; i++) {
      if (sentences[i].trim()) {
        nonEmptyIndices.push(i);
        textsToTranslate.push(sentences[i]);
      }
    }

    let translated: string[] = [];
    let usage: TranslationUsage | undefined;

    if (textsToTranslate.length > 0) {
      if (provider === "gemini") {
        const result = await translateWithGemini({
          texts: textsToTranslate,
          sourceLang,
          targetLang,
          journalId: journal,
        });
        translated = result.translations;
        usage = {
          provider: "gemini",
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        };
      } else {
        const result = await translateWithDeepL({
          texts: textsToTranslate,
          sourceLang,
          targetLang,
        });
        translated = result.translations;
        usage = {
          provider: "deepl",
          characters: result.billedCharacters,
        };
      }
    }

    // Rebuild full translations array with empty strings for empty inputs
    const translations: string[] = sentences.map(() => "");
    for (let i = 0; i < nonEmptyIndices.length; i++) {
      translations[nonEmptyIndices[i]] = translated[i];
    }

    return NextResponse.json({
      translations,
      usage,
    } satisfies SentenceTranslationResponse);
  } catch (error) {
    console.error("Sentence translation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Translation failed" },
      { status: 500 },
    );
  }
}
