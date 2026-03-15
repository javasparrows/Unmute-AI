export type LanguageCode = "ja" | "en" | "zh-CN" | "zh-TW" | "ko" | "de" | "fr" | "es" | "pt-BR" | "ru" | "it" | "hi" | "tr" | "ar" | "id" | "pl" | "fa";

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
}

export interface TranslationRequest {
  text: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  journal?: string;
}

export interface DetectLanguageRequest {
  text: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  sourceText: string;
  translatedText: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  journal?: string;
}

export interface Journal {
  id: string;
  name: string;
  description: string;
  styleGuide: string;
}

export interface ParagraphFeedback {
  paragraphIndex: number;
  role: string;
  logicFlow: string;
  suggestions: string[];
  score: number;
}

export interface StructureCheckResult {
  overallScore: number;
  summary: string;
  paragraphs: ParagraphFeedback[];
}

export type TranslationSource = "left" | "right" | null;

export interface TranslationUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface SentenceTranslationRequest {
  sentences: string[];
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  journal?: string;
}

export interface AlignmentGroup {
  left: number[];
  right: number[];
}

export interface AlignedTranslationItem {
  text: string;
  src: number[];
}

export interface SentenceTranslationResponse {
  translations: string[];
  alignment?: AlignmentGroup[];
  usage?: TranslationUsage;
}
