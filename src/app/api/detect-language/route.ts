import { generateText } from "ai";
import { translationModel } from "@/lib/gemini";
import { buildDetectLanguagePrompt } from "@/lib/prompts";
import type { DetectLanguageRequest, LanguageCode } from "@/types";

const validCodes: LanguageCode[] = ["ja", "en", "zh-CN", "zh-TW", "ko", "de", "fr", "es", "pt-BR", "ru", "it", "hi", "tr", "ar", "id", "pl", "fa"];

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

  let code = detected.trim().toLowerCase();

  // Handle legacy codes from older models
  if (code === "zh") code = "zh-CN";
  if (code === "pt") code = "pt-BR";

  const language = validCodes.includes(code as LanguageCode) ? code as LanguageCode : "en";

  return Response.json({ language });
}
