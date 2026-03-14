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
  if (targetLang === "ar") {
    return `
ARABIC-SPECIFIC RULES:
- Use Modern Standard Arabic (فصحى) for academic writing.
- Write in right-to-left direction.
- Use formal third-person voice, avoiding first-person where possible.`;
  }
  if (targetLang === "fa") {
    return `
PERSIAN-SPECIFIC RULES:
- Use formal academic Persian (فارسی رسمی).
- Write in right-to-left direction.
- Prefer Persian equivalents over Arabic loanwords where standard academic usage exists.`;
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
  return `Detect the language of the given text. Respond with ONLY one of these language codes: "ja", "en", "zh-CN", "zh-TW", "ko", "de", "fr", "es", "pt-BR", "ru", "it", "hi", "tr", "ar", "id", "pl", "fa".

For Chinese text: use "zh-CN" for Simplified Chinese and "zh-TW" for Traditional Chinese.
For Portuguese text: use "pt-BR".
If uncertain, respond with "en". Do not include any other text in your response.`;
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

TASK: Translate each sentence from ${source.name} to ${target.name}.
Every "text" value in your output MUST be written in ${target.name}. Do NOT return the original ${source.name} text.

You will receive a JSON array of ${source.name} sentences (indexed from 0). Return a JSON array of objects, each with:
- "text": the translated sentence in ${target.name}
- "src": an array of source sentence indices that this translation corresponds to

You may merge or split sentences when the target language requires it for natural expression.
For example:
- If source sentences 3 and 4 are best translated as a single sentence, return: {"text": "<translated in ${target.name}>", "src": [3, 4]}
- If source sentence 5 is best split into two, return: {"text": "<first part in ${target.name}>", "src": [5]}, {"text": "<second part in ${target.name}>", "src": [5]}
- For a normal 1:1 translation, return: {"text": "<translated in ${target.name}>", "src": [0]}

CRITICAL RULES:
1. Every source index (0..N-1) must appear in at least one "src" array.
2. Do NOT add any explanation, notes, or commentary.
3. Output ONLY a valid JSON array of objects. No markdown fences, no extra text.
4. Preserve any formatting and special characters within each sentence.
5. PRESERVE ALL LaTeX COMMANDS EXACTLY AS-IS. Do NOT translate, modify, or remove any LaTeX markup including:
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
