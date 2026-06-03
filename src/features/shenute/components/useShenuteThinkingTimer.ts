import { useEffect, useState } from "react";

/* eslint-disable react-hooks/set-state-in-effect -- Shenute timers reset elapsed browser UI state when chat requests start and stop. */

export function useShenuteThinkingTimer(isLoading: boolean) {
  const [thinkingElapsedSeconds, setThinkingElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setThinkingElapsedSeconds(0);
      return;
    }

    const startedAt = Date.now();
    setThinkingElapsedSeconds(0);
    const timer = window.setInterval(() => {
      setThinkingElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isLoading]);

  return thinkingElapsedSeconds;
}
