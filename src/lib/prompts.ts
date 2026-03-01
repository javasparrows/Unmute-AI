import type { LanguageCode } from "@/types";
import { getLanguage } from "./languages";
import { getJournal } from "./journals";

function buildLanguageSpecificRules(targetLang: LanguageCode): string {
  if (targetLang === "ja") {
    return `
JAPANESE-SPECIFIC RULES:
- Use だ・である調 (da/dearu style, also known as 常体). This is the standard writing style for Japanese academic papers.
- Do NOT use です・ます調 (desu/masu style, also known as 敬体).
- Examples: 「〜である。」「〜した。」「〜と考えられる。」「〜を示す。」`;
  }
  return "";
}

export function buildTranslationPrompt(
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
  journalId?: string,
): string {
  const source = getLanguage(sourceLang);
  const target = getLanguage(targetLang);
  const journal = journalId ? getJournal(journalId) : getJournal("general");
  const langRules = buildLanguageSpecificRules(targetLang);

  return `You are an expert academic translator specializing in scientific papers.

Translate the following text from ${source.name} to ${target.name}.

CRITICAL RULES:
1. Maintain a strict 1:1 paragraph correspondence. The input has N paragraphs (separated by double newlines). You must output exactly N paragraphs.
2. Do NOT merge or split paragraphs.
3. Do NOT add any explanation, notes, or commentary.
4. Output ONLY the translated text.
5. Preserve any formatting, line breaks within paragraphs, and special characters.
6. PRESERVE ALL LaTeX COMMANDS EXACTLY AS-IS. Do NOT translate, modify, or remove any LaTeX markup including:
   - Citations: \\cite{...}, \\citep{...}, \\citet{...}, \\citealp{...}
   - References: \\ref{...}, \\eqref{...}, \\autoref{...}, \\cref{...}, \\label{...}
   - Math: $...$, $$...$$, \\(...\\), \\[...\\], \\begin{equation}...\\end{equation}
   - Formatting: \\textbf{...}, \\textit{...}, \\emph{...}, \\underline{...}
   - Environments: \\begin{...}...\\end{...}
   - Any command starting with backslash: \\commandname{...} or \\commandname[...]{...}
   Place LaTeX commands in the grammatically correct position in the translated sentence.
${langRules}
STYLE GUIDE (${journal.name}):
${journal.styleGuide}

Translate naturally and idiomatically for academic publication. Maintain technical accuracy while ensuring readability.`;
}

export function buildDetectLanguagePrompt(): string {
  return `Detect the language of the given text. Respond with ONLY the ISO 639-1 language code (e.g., "ja", "en", "zh", "ko", "de", "fr", "es", "pt"). If uncertain, respond with "en". Do not include any other text in your response.`;
}

export function buildStructureCheckPrompt(
  lang: LanguageCode,
): string {
  const language = getLanguage(lang);

  return `You are an expert academic writing consultant. Analyze the following ${language.name} academic text paragraph by paragraph.

For each paragraph, provide:
1. "role": The paragraph's role (e.g., "Introduction/Background", "Problem Statement", "Methodology", "Results", "Discussion", "Conclusion")
2. "logicFlow": How this paragraph connects to the previous and next paragraphs
3. "suggestions": An array of specific improvement suggestions (max 3)
4. "score": A score from 1-10 for paragraph quality

Also provide:
- "overallScore": Overall structure score (1-10)
- "summary": A brief overall assessment

Respond in JSON format:
{
  "overallScore": number,
  "summary": "string",
  "paragraphs": [
    {
      "paragraphIndex": number,
      "role": "string",
      "logicFlow": "string",
      "suggestions": ["string"],
      "score": number
    }
  ]
}

Respond in ${language.name}. Output ONLY valid JSON, no markdown fences.`;
}

export function buildSentenceTranslationPrompt(
  sentences: string[],
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
  journalId?: string,
): { system: string; user: string } {
  const source = getLanguage(sourceLang);
  const target = getLanguage(targetLang);
  const journal = journalId ? getJournal(journalId) : getJournal("general");
  const langRules = buildLanguageSpecificRules(targetLang);

  const system = `You are an expert academic translator specializing in scientific papers.

Translate each sentence from ${source.name} to ${target.name}.
You will receive a JSON array of sentences. Return a JSON array of translated sentences with the SAME length.

CRITICAL RULES:
1. Maintain a strict 1:1 correspondence. Input has N sentences, output must have exactly N sentences.
2. Do NOT merge or split sentences.
3. Do NOT add any explanation, notes, or commentary.
4. Output ONLY a valid JSON array of strings. No markdown fences, no extra text.
5. Preserve any formatting and special characters within each sentence.
6. PRESERVE ALL LaTeX COMMANDS EXACTLY AS-IS. Do NOT translate, modify, or remove any LaTeX markup including:
   - Citations: \\cite{...}, \\citep{...}, \\citet{...}, \\citealp{...}
   - References: \\ref{...}, \\eqref{...}, \\autoref{...}, \\cref{...}, \\label{...}
   - Math: $...$, $$...$$, \\(...\\), \\[...\\], \\begin{equation}...\\end{equation}
   - Formatting: \\textbf{...}, \\textit{...}, \\emph{...}, \\underline{...}
   - Environments: \\begin{...}...\\end{...}
   - Any command starting with backslash: \\commandname{...} or \\commandname[...]{...}
   Place LaTeX commands in the grammatically correct position in the translated sentence.
${langRules}
STYLE GUIDE (${journal.name}):
${journal.styleGuide}

Translate naturally and idiomatically for academic publication. Maintain technical accuracy while ensuring readability.`;

  const user = JSON.stringify(sentences);

  return { system, user };
}
