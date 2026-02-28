import type { HistoryEntry } from "@/types";

const STORAGE_KEY = "translation-history";
const MAX_ENTRIES = 50;
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

type Listener = () => void;

let listeners: Listener[] = [];
let cachedEntries: HistoryEntry[] | null = null;
const EMPTY_ENTRIES: HistoryEntry[] = [];

function notifyListeners() {
  cachedEntries = null;
  for (const listener of listeners) {
    listener();
  }
}

function readFromStorage(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

function writeToStorage(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    const json = JSON.stringify(entries);
    if (json.length > MAX_SIZE_BYTES) {
      // Trim oldest entries until under size limit
      const trimmed = [...entries];
      while (JSON.stringify(trimmed).length > MAX_SIZE_BYTES && trimmed.length > 1) {
        trimmed.pop();
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(STORAGE_KEY, json);
    }
  } catch {
    // Storage full — remove oldest entries
    const trimmed = entries.slice(0, Math.floor(entries.length / 2));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Give up
    }
  }
}

export const historyStore = {
  getSnapshot(): HistoryEntry[] {
    if (cachedEntries === null) {
      cachedEntries = readFromStorage();
    }
    return cachedEntries;
  },

  getServerSnapshot(): HistoryEntry[] {
    return EMPTY_ENTRIES;
  },

  subscribe(listener: Listener): () => void {
    listeners = [...listeners, listener];
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  addEntry(entry: Omit<HistoryEntry, "id" | "timestamp">) {
    const entries = readFromStorage();
    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    const updated = [newEntry, ...entries].slice(0, MAX_ENTRIES);
    writeToStorage(updated);
    notifyListeners();
  },

  removeEntry(id: string) {
    const entries = readFromStorage();
    const updated = entries.filter((e) => e.id !== id);
    writeToStorage(updated);
    notifyListeners();
  },

  clearAll() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    notifyListeners();
  },
};
