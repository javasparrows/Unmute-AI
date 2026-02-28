"use client";

import { useState, useRef, useCallback } from "react";
import type { LanguageCode, SentenceTranslationResponse } from "@/types";
import {
  splitSentences,
  joinSentences,
  detectChangedSentences,
  isSeparator,
} from "@/lib/split-sentences";
import { useDebouncedCallback } from "./use-debounce";

interface UseSentenceTranslationOptions {
  debounceMs?: number;
}

interface UseSentenceTranslationReturn {
  isTranslating: boolean;
  translate: (
    text: string,
    sourceLang: LanguageCode,
    targetLang: LanguageCode,
    journal?: string,
  ) => void;
  cancelTranslation: () => void;
  translatedText: string;
  setTranslatedText: (text: string) => void;
  error: string | null;
}

export function useSentenceTranslation(
  options: UseSentenceTranslationOptions = {},
): UseSentenceTranslationReturn {
  const { debounceMs = 800 } = options;
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const prevSentencesRef = useRef<string[]>([]);
  const translatedSentencesRef = useRef<string[]>([]);
  const prevParamsRef = useRef<{
    sourceLang: LanguageCode;
    targetLang: LanguageCode;
    journal?: string;
  } | null>(null);

  const doTranslate = useCallback(
    async (
      text: string,
      sourceLang: LanguageCode,
      targetLang: LanguageCode,
      journal?: string,
    ) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (!text.trim()) {
        prevSentencesRef.current = [];
        translatedSentencesRef.current = [];
        setTranslatedText("");
        setIsTranslating(false);
        return;
      }

      const currentSentences = splitSentences(text);

      // Check if language/journal changed → full re-translate
      const paramsChanged =
        prevParamsRef.current === null ||
        prevParamsRef.current.sourceLang !== sourceLang ||
        prevParamsRef.current.targetLang !== targetLang ||
        prevParamsRef.current.journal !== journal;

      prevParamsRef.current = { sourceLang, targetLang, journal };

      // Extract non-separator sentences
      const currentTextSentences = currentSentences.filter(
        (s) => !isSeparator(s),
      );

      let indicesToTranslate: number[];

      if (paramsChanged) {
        // Full re-translate: all non-separator sentences
        indicesToTranslate = currentTextSentences.map((_, i) => i);
        // Reset translated sentences to match new structure
        translatedSentencesRef.current = currentSentences.map((s) =>
          isSeparator(s) ? s : "",
        );
      } else {
        // Diff-based: only changed sentences
        indicesToTranslate = detectChangedSentences(
          prevSentencesRef.current,
          currentSentences,
        );

        // Update translated sentences structure (handle added/removed paragraphs)
        const newTranslated = currentSentences.map((s, i) => {
          if (isSeparator(s)) return s;
          // Try to preserve existing translation for unchanged positions
          const prevTranslated = translatedSentencesRef.current;
          return i < prevTranslated.length ? prevTranslated[i] : "";
        });
        translatedSentencesRef.current = newTranslated;
      }

      prevSentencesRef.current = currentSentences;

      if (indicesToTranslate.length === 0) {
        setIsTranslating(false);
        return;
      }

      // Collect sentences to translate, preserving leading whitespace
      const sentencesToSend = indicesToTranslate.map(
        (i) => currentTextSentences[i],
      );
      // Extract leading whitespace from each sentence to restore after translation
      const leadingWhitespace = sentencesToSend.map((s) => {
        const match = s.match(/^(\s+)/);
        return match ? match[1] : "";
      });
      const trimmedSentences = sentencesToSend.map((s) => s.trim());

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsTranslating(true);
      setError(null);

      try {
        const response = await fetch("/api/translate-sentence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sentences: trimmedSentences,
            sourceLang,
            targetLang,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            (errorData as { error?: string }).error ||
              `Translation failed: ${response.status}`,
          );
        }

        const data = (await response.json()) as SentenceTranslationResponse;

        if (controller.signal.aborted) return;

        // Restore leading whitespace to translated sentences
        const translationsWithWhitespace = data.translations.map(
          (t, i) => leadingWhitespace[i] + t,
        );

        // Map translations back to the correct positions in translatedSentencesRef
        // Build a mapping: non-separator index → position in the full array
        const nonSepPositions: number[] = [];
        for (let i = 0; i < translatedSentencesRef.current.length; i++) {
          if (!isSeparator(currentSentences[i])) {
            nonSepPositions.push(i);
          }
        }

        for (let i = 0; i < indicesToTranslate.length; i++) {
          const sentenceIndex = indicesToTranslate[i];
          const fullArrayPos = nonSepPositions[sentenceIndex];
          if (fullArrayPos !== undefined) {
            translatedSentencesRef.current[fullArrayPos] =
              translationsWithWhitespace[i];
          }
        }

        // Ensure proper spacing between sentences within paragraphs.
        // Handles cases like ja→en where source has no spaces but target needs them.
        for (let i = 1; i < translatedSentencesRef.current.length; i++) {
          const s = translatedSentencesRef.current[i];
          const prev = translatedSentencesRef.current[i - 1];
          if (
            s &&
            !isSeparator(s) &&
            !s.startsWith(" ") &&
            prev &&
            !isSeparator(prev)
          ) {
            translatedSentencesRef.current[i] = " " + s;
          }
        }

        setTranslatedText(joinSentences(translatedSentencesRef.current));
        setIsTranslating(false);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err.message : "Translation failed");
        setIsTranslating(false);
      }
    },
    [],
  );

  const translate = useDebouncedCallback(doTranslate, debounceMs);

  const cancelTranslation = useCallback(() => {
    translate.cancel();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTranslating(false);
  }, [translate]);

  return {
    isTranslating,
    translate,
    cancelTranslation,
    translatedText,
    setTranslatedText,
    error,
  };
}
