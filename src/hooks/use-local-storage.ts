import { useCallback, useSyncExternalStore } from "react";

function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const subscribe = useCallback(
    (callback: () => void) => {
      const handler = (e: StorageEvent) => {
        if (e.key === key) callback();
      };
      // Listen for cross-tab changes
      window.addEventListener("storage", handler);
      // Listen for same-tab changes via custom event
      window.addEventListener(`local-storage-${key}`, callback);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener(`local-storage-${key}`, callback);
      };
    },
    [key],
  );

  const getSnapshot = useCallback(
    () => getStorageItem(key, defaultValue),
    [key, defaultValue],
  );

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const current = getStorageItem(key, defaultValue);
      const resolved = typeof newValue === "function"
        ? (newValue as (prev: T) => T)(current)
        : newValue;
      localStorage.setItem(key, JSON.stringify(resolved));
      window.dispatchEvent(new Event(`local-storage-${key}`));
    },
    [key, defaultValue],
  );

  return [value, setValue];
}
