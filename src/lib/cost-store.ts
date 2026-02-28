import type { TranslationCosts } from "@/types";

const STORAGE_KEY = "translation-costs";

type Listener = () => void;

let listeners: Listener[] = [];
let cachedCosts: TranslationCosts | null = null;

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

function defaultCosts(): TranslationCosts {
  return {
    inputTokens: 0,
    outputTokens: 0,
    lastReset: currentMonth(),
  };
}

function notifyListeners() {
  cachedCosts = null;
  for (const listener of listeners) {
    listener();
  }
}

function readFromStorage(): TranslationCosts {
  if (typeof window === "undefined") return defaultCosts();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultCosts();
    const parsed = JSON.parse(raw);
    // Migration: if old format with deepl/gemini keys, reset
    if (parsed.deepl || parsed.gemini) {
      return defaultCosts();
    }
    return parsed as TranslationCosts;
  } catch {
    return defaultCosts();
  }
}

function writeToStorage(costs: TranslationCosts) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(costs));
  } catch {
    // Storage full — ignore
  }
}

/**
 * Auto-reset costs if the month has changed.
 */
function withMonthlyReset(costs: TranslationCosts): TranslationCosts {
  const month = currentMonth();
  if (costs.lastReset !== month) {
    const reset = defaultCosts();
    writeToStorage(reset);
    return reset;
  }
  return costs;
}

const EMPTY_COSTS: TranslationCosts = defaultCosts();

export const costStore = {
  getSnapshot(): TranslationCosts {
    if (cachedCosts === null) {
      cachedCosts = withMonthlyReset(readFromStorage());
    }
    return cachedCosts;
  },

  getServerSnapshot(): TranslationCosts {
    return EMPTY_COSTS;
  },

  subscribe(listener: Listener): () => void {
    listeners = [...listeners, listener];
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  addUsage(inputTokens: number, outputTokens: number) {
    const costs = withMonthlyReset(readFromStorage());
    costs.inputTokens += inputTokens;
    costs.outputTokens += outputTokens;
    writeToStorage(costs);
    notifyListeners();
  },

  reset() {
    writeToStorage(defaultCosts());
    notifyListeners();
  },
};
