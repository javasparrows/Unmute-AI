"use client";

import { useState, useRef, useCallback } from "react";
import type {
  LanguageCode,
  TranslationProvider,
  TranslationUsage,
  SentenceTranslationResponse,
} from "@/types";
import {
  splitSentences,
  joinSentences,
  detectChangedSentences,
  computeSentenceRanges,
  isSeparator,
} from "@/lib/split-sentences";

interface SyncResult {
  text: string;
  sentenceRanges: { from: number; to: number }[];
}

interface UseSyncTranslationOptions {
  onUsage?: (usage: TranslationUsage) => void;
}

interface UseSyncTranslationReturn {
  isSyncing: boolean;
  error: string | null;
  syncLeftToRight: (
    leftText: string,
    rightText: string,
    leftLang: LanguageCode,
    rightLang: LanguageCode,
    journal?: string,
    provider?: TranslationProvider,
  ) => Promise<SyncResult | null>;
  syncRightToLeft: (
    leftText: string,
    rightText: string,
    leftLang: LanguageCode,
    rightLang: LanguageCode,
    journal?: string,
    provider?: TranslationProvider,
  ) => Promise<SyncResult | null>;
  initSnapshots: (leftText: string, rightText: string) => void;
}

export function useSyncTranslation(
  options: UseSyncTranslationOptions = {},
): UseSyncTranslationReturn {
  const { onUsage } = options;
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leftSnapshotRef = useRef<string[]>([]);
  const rightSnapshotRef = useRef<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const onUsageRef = useRef(onUsage);
  onUsageRef.current = onUsage;

  const initSnapshots = useCallback(
    (leftText: string, rightText: string) => {
      leftSnapshotRef.current = splitSentences(leftText);
      rightSnapshotRef.current = splitSentences(rightText);
    },
    [],
  );

  const syncDirection = useCallback(
    async (
      sourceText: string,
      targetText: string,
      sourceLang: LanguageCode,
      targetLang: LanguageCode,
      sourceSnapshot: React.RefObject<string[]>,
      targetSnapshot: React.RefObject<string[]>,
      journal?: string,
      provider?: TranslationProvider,
    ): Promise<SyncResult | null> => {
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (!sourceText.trim()) {
        // Source cleared → clear target
        sourceSnapshot.current = [];
        targetSnapshot.current = [];
        return { text: "", sentenceRanges: [] };
      }

      const currentSourceSentences = splitSentences(sourceText);
      const currentTargetSentences = splitSentences(targetText);

      // Detect which source sentences changed since last sync
      const changedIndices = detectChangedSentences(
        sourceSnapshot.current,
        currentSourceSentences,
      );

      // If nothing changed, just update snapshots and return
      if (changedIndices.length === 0) {
        sourceSnapshot.current = currentSourceSentences;
        return null;
      }

      // Extract non-separator sentences from source
      const sourceTextSentences = currentSourceSentences.filter(
        (s) => !isSeparator(s),
      );

      // Collect sentences that need translation
      const sentencesToTranslate = changedIndices.map(
        (i) => sourceTextSentences[i],
      );
      const leadingWhitespace = sentencesToTranslate.map((s) => {
        const match = s.match(/^(\s+)/);
        return match ? match[1] : "";
      });
      const trimmedSentences = sentencesToTranslate.map((s) => s.trim());

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsSyncing(true);
      setError(null);

      try {
        const response = await fetch("/api/translate-sentence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sentences: trimmedSentences,
            sourceLang,
            targetLang,
            provider,
            journal,
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

        if (controller.signal.aborted) return null;

        // Report usage
        if (data.usage && onUsageRef.current) {
          onUsageRef.current(data.usage);
        }

        // Restore leading whitespace
        const translationsWithWhitespace = data.translations.map(
          (t, i) => leadingWhitespace[i] + t,
        );

        // Build new target sentences:
        // Adopt the paragraph structure (separators) from the source side,
        // and merge translated sentences into the non-separator slots.
        const newTargetSentences: string[] = [];
        const targetNonSep = currentTargetSentences.filter(
          (s) => !isSeparator(s),
        );

        let nonSepIdx = 0;
        for (const token of currentSourceSentences) {
          if (isSeparator(token)) {
            newTargetSentences.push(token);
          } else {
            // Check if this non-separator index was translated
            const changedPos = changedIndices.indexOf(nonSepIdx);
            if (changedPos !== -1) {
              // Use new translation
              newTargetSentences.push(translationsWithWhitespace[changedPos]);
            } else {
              // Preserve existing target sentence at this position
              newTargetSentences.push(
                nonSepIdx < targetNonSep.length ? targetNonSep[nonSepIdx] : "",
              );
            }
            nonSepIdx++;
          }
        }

        // Ensure proper spacing between sentences within paragraphs
        for (let i = 1; i < newTargetSentences.length; i++) {
          const s = newTargetSentences[i];
          const prev = newTargetSentences[i - 1];
          if (
            s &&
            !isSeparator(s) &&
            !s.startsWith(" ") &&
            prev &&
            !isSeparator(prev)
          ) {
            newTargetSentences[i] = " " + s;
          }
        }

        const resultText = joinSentences(newTargetSentences);
        const resultRanges = computeSentenceRanges(newTargetSentences);

        // Update snapshots
        sourceSnapshot.current = currentSourceSentences;
        targetSnapshot.current = newTargetSentences;

        setIsSyncing(false);
        return { text: resultText, sentenceRanges: resultRanges };
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return null;
        }
        setError(err instanceof Error ? err.message : "Translation failed");
        setIsSyncing(false);
        return null;
      }
    },
    [],
  );

  const syncLeftToRight = useCallback(
    async (
      leftText: string,
      rightText: string,
      leftLang: LanguageCode,
      rightLang: LanguageCode,
      journal?: string,
      provider?: TranslationProvider,
    ) => {
      return syncDirection(
        leftText,
        rightText,
        leftLang,
        rightLang,
        leftSnapshotRef,
        rightSnapshotRef,
        journal,
        provider,
      );
    },
    [syncDirection],
  );

  const syncRightToLeft = useCallback(
    async (
      leftText: string,
      rightText: string,
      leftLang: LanguageCode,
      rightLang: LanguageCode,
      journal?: string,
      provider?: TranslationProvider,
    ) => {
      return syncDirection(
        rightText,
        leftText,
        rightLang,
        leftLang,
        rightSnapshotRef,
        leftSnapshotRef,
        journal,
        provider,
      );
    },
    [syncDirection],
  );

  return {
    isSyncing,
    error,
    syncLeftToRight,
    syncRightToLeft,
    initSnapshots,
  };
}
