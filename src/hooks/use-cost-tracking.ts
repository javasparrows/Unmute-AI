"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { TranslationCosts, TranslationUsage } from "@/types";
import { costStore } from "@/lib/cost-store";

interface UseCostTrackingReturn {
  costs: TranslationCosts;
  addUsage: (usage: TranslationUsage) => void;
  reset: () => void;
}

export function useCostTracking(): UseCostTrackingReturn {
  const costs = useSyncExternalStore(
    costStore.subscribe,
    costStore.getSnapshot,
    costStore.getServerSnapshot,
  );

  const addUsage = useCallback((usage: TranslationUsage) => {
    if (usage.provider === "deepl" && usage.characters != null) {
      costStore.addDeepLUsage(usage.characters);
    } else if (usage.provider === "gemini") {
      costStore.addGeminiUsage(
        usage.inputTokens ?? 0,
        usage.outputTokens ?? 0,
      );
    }
  }, []);

  const reset = useCallback(() => {
    costStore.reset();
  }, []);

  return { costs, addUsage, reset };
}
