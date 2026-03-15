"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
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
import {
  buildIdentityAlignment,
  findAffectedGroups,
  expandWithNeighbors,
  getSourceIndicesFromGroups,
  mergePartialTranslation,
} from "@/lib/alignment";

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
    previousAlignment?: AlignmentGroup[],
  ) => Promise<SyncResult | null>;
  syncRightToLeft: (
    leftText: string,
    rightText: string,
    leftLang: LanguageCode,
    rightLang: LanguageCode,
    journal?: string,
    previousAlignment?: AlignmentGroup[],
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

  /**
   * Build the final target text from non-separator target sentences,
   * using source sentence structure to preserve paragraph separators.
   */
  const buildTargetText = (
    targetNonSep: string[],
    currentSourceSentences: string[],
    alignment: AlignmentGroup[],
  ): { text: string; sentences: string[]; ranges: { from: number; to: number }[] } => {
    const newTargetSentences: string[] = [];
    let sourceNonSepIdx = 0;

    for (const token of currentSourceSentences) {
      if (isSeparator(token)) {
        newTargetSentences.push(token);
      } else {
        if (alignment.length > 0) {
          const groups = alignment.filter((g) =>
            g.left.includes(sourceNonSepIdx),
          );
          for (const group of groups) {
            if (group.left[0] === sourceNonSepIdx) {
              for (const rightIdx of group.right) {
                if (rightIdx < targetNonSep.length) {
                  newTargetSentences.push(targetNonSep[rightIdx]);
                }
              }
            }
          }
        } else {
          if (sourceNonSepIdx < targetNonSep.length) {
            newTargetSentences.push(targetNonSep[sourceNonSepIdx]);
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

    return {
      text: joinSentences(newTargetSentences),
      sentences: newTargetSentences,
      ranges: computeSentenceRanges(newTargetSentences),
    };
  };

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
      previousAlignment?: AlignmentGroup[],
    ): Promise<SyncResult | null> => {
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (!sourceText.trim()) {
        sourceSnapshot.current = [];
        targetSnapshot.current = [];
        return { text: "", sentenceRanges: [], alignment: [] };
      }

      const currentSourceSentences = splitSentences(sourceText);

      const changedIndices = detectChangedSentences(
        sourceSnapshot.current,
        currentSourceSentences,
      );

      if (changedIndices.length === 0) {
        sourceSnapshot.current = currentSourceSentences;
        return null;
      }

      const sourceTextSentences = currentSourceSentences.filter(
        (s) => !isSeparator(s),
      );

      // --- Determine if partial translation is possible ---
      const prevSourceNonSep = sourceSnapshot.current.filter(
        (s) => !isSeparator(s),
      );
      const canDoPartial =
        previousAlignment &&
        previousAlignment.length > 0 &&
        targetSnapshot.current.length > 0 &&
        // Only when sentence count is unchanged (no additions/deletions)
        prevSourceNonSep.length === sourceTextSentences.length &&
        // All changed indices must be covered by alignment
        changedIndices.every((idx) =>
          previousAlignment.some((g) => g.left.includes(idx)),
        );

      let sentencesToSend: string[];
      let localToGlobalMap: number[] | null = null;
      let affectedGroupIndices: number[] | null = null;

      if (canDoPartial) {
        // Partial translation: only send affected groups + neighbors
        affectedGroupIndices = findAffectedGroups(
          previousAlignment,
          changedIndices,
        );
        const expandedGroupIndices = expandWithNeighbors(
          affectedGroupIndices,
          previousAlignment.length,
        );
        const sourceIndicesToSend = getSourceIndicesFromGroups(
          previousAlignment,
          expandedGroupIndices,
        );
        localToGlobalMap = sourceIndicesToSend;
        sentencesToSend = sourceIndicesToSend.map((i) =>
          sourceTextSentences[i].trim(),
        );
      } else {
        // Full translation: send all sentences
        sentencesToSend = sourceTextSentences.map((s) => s.trim());
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setSyncingDirection(direction);
      setError(null);

      try {
        const response = await fetch("/api/v2/translate-sentence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sentences: sentencesToSend,
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

        if (data.usage && onUsageRef.current) {
          onUsageRef.current(data.usage);
        }

        const translatedTexts = data.translations;
        const apiAlignment =
          data.alignment && data.alignment.length > 0
            ? data.alignment
            : buildIdentityAlignment(
                Math.min(sentencesToSend.length, translatedTexts.length),
              );

        let finalTargetNonSep: string[];
        let finalAlignment: AlignmentGroup[];

        if (
          canDoPartial &&
          localToGlobalMap &&
          affectedGroupIndices &&
          previousAlignment
        ) {
          // --- Partial merge: only update affected groups ---
          const previousTargetNonSep = targetSnapshot.current.filter(
            (s) => !isSeparator(s),
          );

          const merged = mergePartialTranslation({
            previousAlignment,
            previousTargetNonSep,
            affectedGroupIndices,
            apiTranslations: translatedTexts,
            apiAlignment,
            localToGlobalSourceMap: localToGlobalMap,
          });

          finalTargetNonSep = merged.targetNonSep;
          finalAlignment = merged.alignment;
        } else {
          // --- Full translation: build target from all translations ---
          finalTargetNonSep = translatedTexts;

          // Remap alignment to account for empty sentence filtering in API
          finalAlignment = apiAlignment;
        }

        // Restore leading whitespace from source sentences
        const leadingWhitespace = sourceTextSentences.map((s) => {
          const match = s.match(/^(\s+)/);
          return match ? match[1] : "";
        });

        // For full translation, apply whitespace to all; for partial, only to new translations
        if (!canDoPartial) {
          finalTargetNonSep = finalTargetNonSep.map((t, i) => {
            const ws = i < leadingWhitespace.length ? leadingWhitespace[i] : "";
            return ws + t;
          });
        }

        const built = buildTargetText(
          finalTargetNonSep,
          currentSourceSentences,
          finalAlignment,
        );

        // Update snapshots
        sourceSnapshot.current = currentSourceSentences;
        targetSnapshot.current = built.sentences;

        setSyncingDirection(null);
        return {
          text: built.text,
          sentenceRanges: built.ranges,
          alignment: finalAlignment,
        };
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return null;
        }
        const message = err instanceof Error ? err.message : "Translation failed";
        setError(message);
        if (message.includes("上限")) {
          toast.error(message, {
            action: {
              label: "プランを確認",
              onClick: () => window.open("/pricing", "_blank"),
            },
          });
        }
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
      previousAlignment?: AlignmentGroup[],
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
        previousAlignment,
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
      previousAlignment?: AlignmentGroup[],
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
        previousAlignment,
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
