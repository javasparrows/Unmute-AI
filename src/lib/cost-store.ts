import type { TranslationCosts } from "@/types";

const STORAGE_KEY = "translation-costs";

type Listener = () => void;

let listeners: Listener[] = [];
let cachedCosts: TranslationCosts | null = null;

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

function defaultCosts(): TranslationCosts {
  const month = currentMonth();
  return {
    deepl: { characters: 0, lastReset: month },
    gemini: { inputTokens: 0, outputTokens: 0, lastReset: month },
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
    return JSON.parse(raw) as TranslationCosts;
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
  let changed = false;

  if (costs.deepl.lastReset !== month) {
    costs = {
      ...costs,
      deepl: { characters: 0, lastReset: month },
    };
    changed = true;
  }

  if (costs.gemini.lastReset !== month) {
    costs = {
      ...costs,
      gemini: { inputTokens: 0, outputTokens: 0, lastReset: month },
    };
    changed = true;
  }

  if (changed) {
    writeToStorage(costs);
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

  addDeepLUsage(characters: number) {
    const costs = withMonthlyReset(readFromStorage());
    costs.deepl.characters += characters;
    writeToStorage(costs);
    notifyListeners();
  },

  addGeminiUsage(inputTokens: number, outputTokens: number) {
    const costs = withMonthlyReset(readFromStorage());
    costs.gemini.inputTokens += inputTokens;
    costs.gemini.outputTokens += outputTokens;
    writeToStorage(costs);
    notifyListeners();
  },

  reset() {
    writeToStorage(defaultCosts());
    notifyListeners();
  },
};
