"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { FloatingTooltip } from "@/components/FloatingTooltip";
import {
  richTooltipBubbleClassName,
  tooltipArrowClassName,
} from "@/components/MicroTooltip";
import { cx } from "@/lib/classes";
import { useMediaQuery } from "@/lib/useMediaQuery";

import { useGrammarLessonRenderContext } from "./GrammarLessonRenderContext";

type FootnoteAlign = "center" | "left" | "right";

type FootnoteProps = {
  number: number;
  content: ReactNode;
  align?: FootnoteAlign;
};

const HOVER_POINTER_MEDIA_QUERY = "(hover: hover) and (pointer: fine)";

export function Footnote({ number, content, align = "center" }: FootnoteProps) {
  const { registerFootnote, renderMode } = useGrammarLessonRenderContext();
  const tooltipId = useId();
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const canHover = useMediaQuery(HOVER_POINTER_MEDIA_QUERY);

  useEffect(() => {
    registerFootnote({ content, number });
  }, [content, number, registerFootnote]);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const openTooltip = () => {
    clearCloseTimeout();
    setIsOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 80);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (
        anchorRef.current?.contains(target) ||
        tooltipRef.current?.contains(target)
      ) {
        return;
      }

      clearCloseTimeout();
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearCloseTimeout();
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      clearCloseTimeout();
    };
  }, []);

  const handleClick = () => {
    if (renderMode === "pdf") {
      return;
    }

    if (canHover) {
      openTooltip();
      return;
    }

    setIsOpen((current) => {
      if (current) {
        return false;
      }

      return true;
    });
  };

  const tooltip =
    renderMode === "web" ? (
      <FloatingTooltip
        align={align}
        anchorRef={anchorRef}
        arrowClassName={tooltipArrowClassName}
        className={cx(
          richTooltipBubbleClassName,
          "[&_p]:text-muted [&_li]:text-muted",
          "[&_strong]:text-ink [&_em]:text-ink [&_.small-caps]:text-ink",
          "[&_a]:text-coptic [&_a]:decoration-coptic/40 [&_a:hover]:text-ink",
          "[&_.font-coptic]:text-coptic [&_sup]:text-current",
        )}
        id={tooltipId}
        isOpen={isOpen}
        onMouseEnter={canHover ? openTooltip : undefined}
        onMouseLeave={canHover ? scheduleClose : undefined}
        tooltipRef={tooltipRef}
        withArrow
      >
        {content}
      </FloatingTooltip>
    ) : null;

  return (
    <>
      <sup className="ml-0.5 align-super">
        {renderMode === "pdf" ? (
          <span className="inline-flex rounded-sm font-bold text-coptic">
            [{number}]
          </span>
        ) : (
          <button
            ref={anchorRef}
            type="button"
            aria-describedby={isOpen ? tooltipId : undefined}
            aria-expanded={isOpen}
            className="inline-flex cursor-help rounded-sm font-bold text-coptic outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-coptic/35"
            onClick={handleClick}
            onFocus={openTooltip}
            onBlur={canHover ? scheduleClose : undefined}
            onMouseEnter={canHover ? openTooltip : undefined}
            onMouseLeave={canHover ? scheduleClose : undefined}
          >
            [{number}]
          </button>
        )}
      </sup>
      {tooltip}
    </>
  );
}
