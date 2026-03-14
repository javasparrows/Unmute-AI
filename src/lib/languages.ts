import type { Language, LanguageCode } from "@/types";

export const languages: Language[] = [
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "简体中文" },
  { code: "zh-TW", name: "Chinese (Traditional)", nativeName: "繁體中文" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "pt-BR", name: "Portuguese (Brazilian)", nativeName: "Português (Brasil)" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "fa", name: "Persian", nativeName: "فارسی" },
];

// Map legacy language codes to current codes (for existing documents in DB)
const LEGACY_CODE_MAP: Record<string, LanguageCode> = {
  zh: "zh-CN",
  pt: "pt-BR",
};

export function getLanguage(code: LanguageCode | string): Language {
  const resolved = LEGACY_CODE_MAP[code] ?? code;
  return languages.find((l) => l.code === resolved) ?? languages[1]; // fallback to English
}

export function getLanguageLabel(code: LanguageCode): string {
  const lang = getLanguage(code);
  return `${lang.nativeName}`;
}
