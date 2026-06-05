import { useCallback, useEffect, useRef, useState } from "react";

import { useMediaQuery } from "@/lib/useMediaQuery";

/* eslint-disable react-hooks/set-state-in-effect -- Shenute transcript chrome synchronizes scroll state with browser layout. */

const UTILITY_CHROME_COLLAPSE_DELTA = 12;
const UTILITY_CHROME_EXPAND_DELTA = 20;
const UTILITY_CHROME_BOTTOM_THRESHOLD = 120;
const MOBILE_VIEWPORT_MEDIA_QUERY = "(max-width: 639px)";

type UseShenuteTranscriptChromeOptions = {
  forceUtilityChromeExpanded: boolean;
  hasRestoredHistory: boolean;
  isLoading: boolean;
  typedMessagesLength: number;
};

export function useShenuteTranscriptChrome({
  forceUtilityChromeExpanded,
  hasRestoredHistory,
  isLoading,
  typedMessagesLength,
}: UseShenuteTranscriptChromeOptions) {
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastTranscriptScrollTopRef = useRef(0);
  const isMobileViewport = useMediaQuery(MOBILE_VIEWPORT_MEDIA_QUERY);
  const [isTranscriptAtBottom, setIsTranscriptAtBottom] = useState(true);
  const [isUtilityChromeCollapsed, setIsUtilityChromeCollapsed] =
    useState(false);
  const shouldKeepUtilityChromeExpanded =
    !isMobileViewport ||
    typedMessagesLength === 0 ||
    forceUtilityChromeExpanded;

  const updateTranscriptScrollState = useCallback(() => {
    const transcript = transcriptScrollRef.current;
    if (!transcript) {
      lastTranscriptScrollTopRef.current = 0;
      setIsTranscriptAtBottom(true);
      setIsUtilityChromeCollapsed(false);
      return;
    }

    const distanceFromBottom =
      transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight;
    const nextIsAtBottom = distanceFromBottom < 96;
    const scrollDelta =
      transcript.scrollTop - lastTranscriptScrollTopRef.current;
    lastTranscriptScrollTopRef.current = transcript.scrollTop;

    setIsTranscriptAtBottom((current) =>
      current === nextIsAtBottom ? current : nextIsAtBottom,
    );

    if (
      nextIsAtBottom ||
      shouldKeepUtilityChromeExpanded ||
      document.querySelector("details[open]")
    ) {
      setIsUtilityChromeCollapsed(false);
      return;
    }

    if (
      scrollDelta < -UTILITY_CHROME_COLLAPSE_DELTA &&
      distanceFromBottom > UTILITY_CHROME_BOTTOM_THRESHOLD
    ) {
      setIsUtilityChromeCollapsed(true);
      return;
    }

    if (scrollDelta > UTILITY_CHROME_EXPAND_DELTA) {
      setIsUtilityChromeCollapsed(false);
    }
  }, [shouldKeepUtilityChromeExpanded]);

  const scrollTranscriptToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const transcript = transcriptScrollRef.current;
      if (transcript) {
        lastTranscriptScrollTopRef.current = Math.max(
          0,
          transcript.scrollHeight - transcript.clientHeight,
        );
        transcript.scrollTo({
          top: transcript.scrollHeight,
          behavior,
        });
      } else {
        messagesEndRef.current?.scrollIntoView({
          block: "end",
          behavior,
        });
      }

      setIsTranscriptAtBottom(true);
      setIsUtilityChromeCollapsed(false);
    },
    [],
  );

  useEffect(() => {
    if (!isMobileViewport) {
      setIsUtilityChromeCollapsed(false);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    if (shouldKeepUtilityChromeExpanded) {
      setIsUtilityChromeCollapsed(false);
    }
  }, [shouldKeepUtilityChromeExpanded]);

  useEffect(() => {
    if (typedMessagesLength === 0 || isLoading) {
      setIsUtilityChromeCollapsed(false);
    }
  }, [isLoading, typedMessagesLength]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const transcript = transcriptScrollRef.current;
      lastTranscriptScrollTopRef.current = transcript?.scrollTop ?? 0;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [hasRestoredHistory, isMobileViewport, typedMessagesLength]);

  useEffect(() => {
    if (typedMessagesLength === 0) {
      setIsTranscriptAtBottom(true);
      return;
    }

    if (!isTranscriptAtBottom) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollTranscriptToBottom("smooth");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    isLoading,
    isTranscriptAtBottom,
    scrollTranscriptToBottom,
    typedMessagesLength,
  ]);

  return {
    isMobileViewport,
    isTranscriptAtBottom,
    isUtilityChromeCollapsed,
    messagesEndRef,
    scrollTranscriptToBottom,
    setIsTranscriptAtBottom,
    setIsUtilityChromeCollapsed,
    transcriptScrollRef,
    updateTranscriptScrollState,
  };
}
