import type { LanguageCode } from "@/types";

const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";

/**
 * Map internal language codes to DeepL API language codes.
 */
function toDeepLLang(code: LanguageCode): string {
  const map: Record<LanguageCode, string> = {
    ja: "JA",
    en: "EN",
    zh: "ZH-HANS",
    ko: "KO",
    de: "DE",
    fr: "FR",
    es: "ES",
    pt: "PT-BR",
  };
  return map[code];
}

export async function translateWithDeepL(params: {
  texts: string[];
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
}): Promise<string[]> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPL_API_KEY is not set");
  }

  if (params.texts.length === 0) return [];

  const body = new URLSearchParams();
  for (const text of params.texts) {
    body.append("text", text);
  }
  body.append("source_lang", toDeepLLang(params.sourceLang));
  body.append("target_lang", toDeepLLang(params.targetLang));

  const response = await fetch(DEEPL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepL API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as {
    translations: { text: string }[];
  };

  return data.translations.map((t) => t.text);
}
