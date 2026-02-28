import type { Language, LanguageCode } from "@/types";

export const languages: Language[] = [
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
];

export function getLanguage(code: LanguageCode): Language {
  return languages.find((l) => l.code === code)!;
}

export function getLanguageLabel(code: LanguageCode): string {
  const lang = getLanguage(code);
  return `${lang.nativeName}`;
}
