import { NextResponse } from "next/server";
import type { SentenceTranslationRequest, SentenceTranslationResponse } from "@/types";
import { translateWithDeepL } from "@/lib/deepl";

export async function POST(request: Request) {
  try {
    const { sentences, sourceLang, targetLang } =
      (await request.json()) as SentenceTranslationRequest;

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

    // Translate non-empty sentences in batch
    const translated =
      textsToTranslate.length > 0
        ? await translateWithDeepL({
            texts: textsToTranslate,
            sourceLang,
            targetLang,
          })
        : [];

    // Rebuild full translations array with empty strings for empty inputs
    const translations: string[] = sentences.map(() => "");
    for (let i = 0; i < nonEmptyIndices.length; i++) {
      translations[nonEmptyIndices[i]] = translated[i];
    }

    return NextResponse.json({ translations } satisfies SentenceTranslationResponse);
  } catch (error) {
    console.error("Sentence translation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Translation failed" },
      { status: 500 },
    );
  }
}
