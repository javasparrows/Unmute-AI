import { streamText } from "ai";
import { translationModel } from "@/lib/gemini";
import { buildTranslationPrompt } from "@/lib/prompts";
import type { TranslationRequest } from "@/types";

export async function POST(request: Request) {
  const body = (await request.json()) as TranslationRequest;
  const { text, sourceLang, targetLang, journal } = body;

  if (!text?.trim()) {
    return new Response("", { status: 200 });
  }

  const systemPrompt = buildTranslationPrompt(sourceLang, targetLang, journal);

  const result = streamText({
    model: translationModel,
    system: systemPrompt,
    prompt: text,
  });

  return result.toTextStreamResponse();
}
