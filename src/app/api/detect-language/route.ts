import { generateText } from "ai";
import { translationModel } from "@/lib/gemini";
import { buildDetectLanguagePrompt } from "@/lib/prompts";
import type { DetectLanguageRequest, LanguageCode } from "@/types";

const validCodes: LanguageCode[] = ["ja", "en", "zh", "ko", "de", "fr", "es", "pt"];

export async function POST(request: Request) {
  const body = (await request.json()) as DetectLanguageRequest;
  const { text } = body;

  if (!text?.trim()) {
    return Response.json({ language: "en" });
  }

  // Take first 200 chars for detection
  const sample = text.slice(0, 200);

  const { text: detected } = await generateText({
    model: translationModel,
    system: buildDetectLanguagePrompt(),
    prompt: sample,
  });

  const code = detected.trim().toLowerCase() as LanguageCode;
  const language = validCodes.includes(code) ? code : "en";

  return Response.json({ language });
}
