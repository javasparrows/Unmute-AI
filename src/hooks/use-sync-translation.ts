"use client";

import { useState, useRef, useCallback } from "react";
import type {
  LanguageCode,
  TranslationUsage,
  SentenceTranslationResponse,
  AlignmentGroup,
} from "@/types";
import {
  splitSentences,
  joinSentences,
  detectChangedSentences,
  computeSentenceRanges,
  isSeparator,
} from "@/lib/split-sentences";
import { buildIdentityAlignment } from "@/lib/alignment";

interface SyncResult {
  text: string;
  sentenceRanges: { from: number; to: number }[];
  alignment: AlignmentGroup[];
}

interface UseSyncTranslationOptions {
  onUsage?: (usage: TranslationUsage) => void;
}

export type SyncDirection = "left" | "right" | null;

interface UseSyncTranslationReturn {
  isSyncing: boolean;
  syncingDirection: SyncDirection;
  error: string | null;
  syncLeftToRight: (
    leftText: string,
    rightText: string,
    leftLang: LanguageCode,
    rightLang: LanguageCode,
    journal?: string,
  ) => Promise<SyncResult | null>;
  syncRightToLeft: (
    leftText: string,
    rightText: string,
    leftLang: LanguageCode,
    rightLang: LanguageCode,
    journal?: string,
  ) => Promise<SyncResult | null>;
  initSnapshots: (leftText: string, rightText: string) => void;
}

export function useSyncTranslation(
  options: UseSyncTranslationOptions = {},
): UseSyncTranslationReturn {
  const { onUsage } = options;
  const [syncingDirection, setSyncingDirection] = useState<SyncDirection>(null);
  const [error, setError] = useState<string | null>(null);
  const isSyncing = syncingDirection !== null;

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

  const doSync = useCallback(
    async (
      sourceText: string,
      _targetText: string,
      sourceLang: LanguageCode,
      targetLang: LanguageCode,
      sourceSnapshot: React.RefObject<string[]>,
      targetSnapshot: React.RefObject<string[]>,
      direction: "left" | "right",
      journal?: string,
    ): Promise<SyncResult | null> => {
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (!sourceText.trim()) {
        // Source cleared → clear target
        sourceSnapshot.current = [];
        targetSnapshot.current = [];
        return { text: "", sentenceRanges: [], alignment: [] };
      }

      const currentSourceSentences = splitSentences(sourceText);

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

      // For N:M alignment, always send all non-empty sentences for full translation
      // so Gemini can properly decide how to merge/split across the full context
      const allSentencesToTranslate = sourceTextSentences;
      const leadingWhitespace = allSentencesToTranslate.map((s) => {
        const match = s.match(/^(\s+)/);
        return match ? match[1] : "";
      });
      const trimmedSentences = allSentencesToTranslate.map((s) => s.trim());

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setSyncingDirection(direction);
      setError(null);

      try {
        const response = await fetch("/api/translate-sentence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sentences: trimmedSentences,
            sourceLang,
            targetLang,
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

        // Build result text from translated sentences with paragraph separators
        // The API returns N:M translations — just join them with spaces
        const translatedTexts = data.translations;

        // Rebuild the target text preserving paragraph structure from source
        // Count separators in source to reconstruct paragraph breaks
        const newTargetSentences: string[] = [];
        let translationIdx = 0;
        let sourceNonSepIdx = 0;

        for (const token of currentSourceSentences) {
          if (isSeparator(token)) {
            newTargetSentences.push(token);
          } else {
            // Find translations that correspond to this source index
            if (data.alignment && data.alignment.length > 0) {
              // With alignment: find groups that include this source non-sep index
              const groups = data.alignment.filter((g) =>
                g.left.includes(sourceNonSepIdx),
              );
              for (const group of groups) {
                // Only emit translation for the first left index in the group
                if (group.left[0] === sourceNonSepIdx) {
                  for (const rightIdx of group.right) {
                    if (rightIdx < translatedTexts.length) {
                      const ws =
                        rightIdx < leadingWhitespace.length
                          ? leadingWhitespace[rightIdx]
                          : "";
                      newTargetSentences.push(ws + translatedTexts[rightIdx]);
                    }
                  }
                }
              }
            } else {
              // No alignment — 1:1 fallback
              if (translationIdx < translatedTexts.length) {
                newTargetSentences.push(
                  leadingWhitespace[sourceNonSepIdx] +
                    translatedTexts[translationIdx],
                );
                translationIdx++;
              }
            }
            sourceNonSepIdx++;
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

        // Build alignment or use identity
        const alignment =
          data.alignment && data.alignment.length > 0
            ? data.alignment
            : buildIdentityAlignment(
                Math.min(
                  sourceTextSentences.length,
                  translatedTexts.length,
                ),
              );

        // Update snapshots
        sourceSnapshot.current = currentSourceSentences;
        targetSnapshot.current = newTargetSentences;

        setSyncingDirection(null);
        return { text: resultText, sentenceRanges: resultRanges, alignment };
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return null;
        }
        setError(err instanceof Error ? err.message : "Translation failed");
        setSyncingDirection(null);
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
    ) => {
      return doSync(
        leftText,
        rightText,
        leftLang,
        rightLang,
        leftSnapshotRef,
        rightSnapshotRef,
        "left",
        journal,
      );
    },
    [doSync],
  );

  const syncRightToLeft = useCallback(
    async (
      leftText: string,
      rightText: string,
      leftLang: LanguageCode,
      rightLang: LanguageCode,
      journal?: string,
    ) => {
      return doSync(
        rightText,
        leftText,
        rightLang,
        leftLang,
        rightSnapshotRef,
        leftSnapshotRef,
        "right",
        journal,
      );
    },
    [doSync],
  );

  return {
    isSyncing,
    syncingDirection,
    error,
    syncLeftToRight,
    syncRightToLeft,
    initSnapshots,
  };
}
