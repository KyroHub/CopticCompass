"use client";

import { useEffect, type ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipArrow,
} from "@/components/Tooltip";
import { cx } from "@/lib/classes";

import { useGrammarLessonRenderContext } from "./GrammarLessonRenderContext";

type FootnoteAlign = "center" | "left" | "right";

type FootnoteProps = {
  number: number;
  content: ReactNode;
  align?: FootnoteAlign;
};

export function Footnote({ number, content }: FootnoteProps) {
  const { registerFootnote, renderMode } = useGrammarLessonRenderContext();

  useEffect(() => {
    registerFootnote({ content, number });
  }, [content, number, registerFootnote]);

  if (renderMode === "pdf") {
    return (
      <sup className="ml-0.5 align-super">
        <span className="inline-flex rounded-sm font-bold text-coptic">
          [{number}]
        </span>
      </sup>
    );
  }

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <sup className="ml-0.5 align-super">
          <button
            type="button"
            className="inline-flex cursor-help rounded-sm font-bold text-coptic outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-coptic/35"
          >
            [{number}]
          </button>
        </sup>
      </TooltipTrigger>
      <TooltipContent
        variant="rich"
        className={cx(
          "[&_p]:text-muted [&_li]:text-muted",
          "[&_strong]:text-ink [&_em]:text-ink [&_.small-caps]:text-ink",
          "[&_a]:text-coptic [&_a]:decoration-coptic/40 [&_a:hover]:text-ink",
          "[&_.font-coptic]:text-coptic [&_sup]:text-current",
        )}
      >
        {content}
        <TooltipArrow />
      </TooltipContent>
    </Tooltip>
  );
}
