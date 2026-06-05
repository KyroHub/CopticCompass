import { useEffect } from "react";

import type { RefObject } from "react";

type UseShenuteTextareaAutosizeOptions = {
  inputValue: string;
  isMobileViewport: boolean;
  maxHeight: number;
  minHeight: number;
  mobileMaxHeight?: number;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

export function useShenuteTextareaAutosize({
  inputValue,
  isMobileViewport,
  maxHeight,
  minHeight,
  mobileMaxHeight,
  textareaRef,
}: UseShenuteTextareaAutosizeOptions) {
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    if (inputValue.length === 0) {
      textarea.style.height = `${minHeight}px`;
      return;
    }

    textarea.style.height = "auto";
    const resolvedMaxHeight =
      isMobileViewport && typeof mobileMaxHeight === "number"
        ? mobileMaxHeight
        : maxHeight;
    textarea.style.height = `${Math.min(
      Math.max(textarea.scrollHeight, minHeight),
      resolvedMaxHeight,
    )}px`;
  }, [
    inputValue,
    isMobileViewport,
    maxHeight,
    minHeight,
    mobileMaxHeight,
    textareaRef,
  ]);
}
