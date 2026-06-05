"use client";

import { useCallback, useSyncExternalStore } from "react";

export type DictionaryResultMode = "compact" | "detailed";

const STORAGE_KEY = "coptic_compass_dictionary_result_mode";
const STORAGE_EVENT = "dictionary-result-mode-storage";
const DEFAULT_RESULT_MODE: DictionaryResultMode = "compact";

function isDictionaryResultMode(
  value: string | null,
): value is DictionaryResultMode {
  return value === "compact" || value === "detailed";
}

function getStoredResultMode(): DictionaryResultMode {
  if (typeof window === "undefined") {
    return DEFAULT_RESULT_MODE;
  }

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    return isDictionaryResultMode(storedValue)
      ? storedValue
      : DEFAULT_RESULT_MODE;
  } catch {
    return DEFAULT_RESULT_MODE;
  }
}

function dispatchResultModeUpdate() {
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  function handleStorage(event: Event) {
    if (event instanceof StorageEvent) {
      if (event.key !== null && event.key !== STORAGE_KEY) {
        return;
      }
    }

    callback();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_EVENT, handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_EVENT, handleStorage);
  };
}

export function useDictionaryResultMode() {
  const resultMode = useSyncExternalStore(
    subscribe,
    getStoredResultMode,
    () => DEFAULT_RESULT_MODE,
  );

  const setResultMode = useCallback((nextMode: DictionaryResultMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
      dispatchResultModeUpdate();
    } catch {
      return;
    }
  }, []);

  return [resultMode, setResultMode] as const;
}
