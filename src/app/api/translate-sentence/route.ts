import { NextResponse } from "next/server";
import type {
  SentenceTranslationRequest,
  SentenceTranslationResponse,
  TranslationUsage,
} from "@/types";
import { translateWithGemini } from "@/lib/gemini-translate";
import { auth } from "@/lib/auth";
import { getUserPlanById } from "@/lib/user-plan";
import {
  checkTranslationLimit,
  recordTranslationUsage,
  recordApiUsage,
} from "@/app/actions/usage";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      sentences,
      sourceLang,
      targetLang,
      journal,
    } = (await request.json()) as SentenceTranslationRequest;

    if (!sentences || !sourceLang || !targetLang) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const { plan } = await getUserPlanById(session.user.id);

    // Filter out empty sentences, keep track of indices
    const nonEmptyIndices: number[] = [];
    const textsToTranslate: string[] = [];

    for (let i = 0; i < sentences.length; i++) {
      if (sentences[i].trim()) {
        nonEmptyIndices.push(i);
        textsToTranslate.push(sentences[i]);
      }
    }

    // Check translation char limit
    const totalChars = textsToTranslate.reduce(
      (sum, t) => sum + t.length,
      0,
    );
    const limitCheck = await checkTranslationLimit(
      session.user.id,
      plan,
      totalChars,
    );
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "翻訳文字数の上限に達しました",
          code: "TRANSLATION_LIMIT",
          remaining: limitCheck.remaining,
        },
        { status: 429 },
      );
    }

    let translated: string[] = [];
    let usage: TranslationUsage | undefined;

    if (textsToTranslate.length > 0) {
      const result = await translateWithGemini({
        texts: textsToTranslate,
        sourceLang,
        targetLang,
        journalId: journal,
      });
      translated = result.translations;
      usage = {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      };

      // Record usage
      await recordTranslationUsage(session.user.id, totalChars);

      const translatedChars = translated.reduce(
        (sum, t) => sum + t.length,
        0,
      );
      await recordApiUsage({
        userId: session.user.id,
        type: "translation",
        model: "gemini-2.5-flash",
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        sourceChars: totalChars,
        translatedChars,
        sourceLang,
        targetLang,
      });
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
