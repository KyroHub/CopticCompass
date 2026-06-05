"use client";

import { useCallback, useSyncExternalStore } from "react";

function getMediaQuerySnapshot(query: string, fallback: boolean) {
  if (typeof window === "undefined" || !("matchMedia" in window)) {
    return fallback;
  }

  return window.matchMedia(query).matches;
}

export function useMediaQuery(query: string, fallback = false) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined" || !("matchMedia" in window)) {
        return () => {};
      }

      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", onStoreChange);

      return () => {
        mediaQuery.removeEventListener("change", onStoreChange);
      };
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => getMediaQuerySnapshot(query, fallback),
    [fallback, query],
  );
  const getServerSnapshot = useCallback(() => fallback, [fallback]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
