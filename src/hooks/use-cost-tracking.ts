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
    costStore.addUsage(usage.inputTokens, usage.outputTokens);
  }, []);

  const reset = useCallback(() => {
    costStore.reset();
  }, []);

  return { costs, addUsage, reset };
}
