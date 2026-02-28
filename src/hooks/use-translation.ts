"use client";

import { useState, useRef, useCallback } from "react";
import type { LanguageCode } from "@/types";
import { useDebouncedCallback } from "./use-debounce";

interface UseTranslationOptions {
  debounceMs?: number;
}

interface UseTranslationReturn {
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

export function useTranslation(
  options: UseTranslationOptions = {},
): UseTranslationReturn {
  const { debounceMs = 800 } = options;
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
        setTranslatedText("");
        setIsTranslating(false);
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsTranslating(true);
      setError(null);

      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, sourceLang, targetLang, journal }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Translation failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let result = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (controller.signal.aborted) break;

          const chunk = decoder.decode(value, { stream: true });
          result += chunk;
          setTranslatedText(result);
        }

        setIsTranslating(false);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // Silently handle abort
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
