"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useLanguage } from "@/components/LanguageProvider";
import { cx } from "@/lib/classes";

import { useGrammarLessonRenderContext } from "./GrammarLessonRenderContext";

type GrammarLessonSectionProps = {
  id: string;
  index: number;
  title: ReactNode;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  footer?: ReactNode;
  openOnHashMatch?: boolean;
};

type GrammarLessonCardProps = {
  children: ReactNode;
  className?: string;
  tone?: "coptic" | "neutral";
};

type GrammarLessonTableProps = {
  children: ReactNode;
  className?: string;
  tableClassName?: string;
  mobileMinWidthRem?: number;
  hasStickyLeadingColumn?: boolean;
  tableId?: string;
  mobileLayout?: "scroll" | "cards";
};

type GrammarLessonOutlineProps = {
  title: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
  activeSectionId?: string | null;
  sections: readonly {
    id: string;
    title: ReactNode;
  }[];
};

export function GrammarLessonSection({
  id,
  index,
  title,
  children,
  className,
  defaultOpen = true,
  footer,
  openOnHashMatch = false,
}: GrammarLessonSectionProps) {
  const { renderMode } = useGrammarLessonRenderContext();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!openOnHashMatch || renderMode === "pdf") {
      return;
    }

    function revealHashTarget() {
      const detailsElement = detailsRef.current;
      const hash = window.location.hash;

      if (!detailsElement || !hash) {
        return;
      }

      const targetId = decodeURIComponent(hash.slice(1));
      const targetElement = document.getElementById(targetId);

      if (!targetElement) {
        return;
      }

      if (
        targetElement === detailsElement ||
        detailsElement.contains(targetElement)
      ) {
        detailsElement.open = true;

        window.requestAnimationFrame(() => {
          targetElement.scrollIntoView({ block: "start", behavior: "smooth" });
        });
      }
    }

    revealHashTarget();
    window.addEventListener("hashchange", revealHashTarget);

    return () => {
      window.removeEventListener("hashchange", revealHashTarget);
    };
  }, [openOnHashMatch, renderMode]);

  return (
    <details
      ref={detailsRef}
      id={id}
      open={renderMode === "pdf" ? true : defaultOpen}
      className={cx(
        "group app-anchor-section overflow-hidden rounded-lg border border-line bg-surface/88 shadow-soft backdrop-blur-sm",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-3 [&::-webkit-details-marker]:hidden sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-start gap-4">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-coptic/20 bg-coptic-soft text-xs font-semibold text-coptic">
            {String(index).padStart(2, "0")}
          </span>
          <h2 className="min-w-0 text-lg font-semibold text-ink sm:text-xl md:text-2xl">
            {title}
          </h2>
        </div>
        <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="border-t border-line px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
        {children}
        {renderMode !== "pdf" && footer ? (
          <div className="mt-5 border-t border-line pt-4">{footer}</div>
        ) : null}
      </div>
    </details>
  );
}

export function GrammarLessonOutline({
  title,
  eyebrow,
  className,
  activeSectionId,
  sections,
}: GrammarLessonOutlineProps) {
  if (sections.length === 0) {
    return null;
  }

  return (
    <nav
      className={cx(
        "overflow-hidden rounded-lg border border-line bg-surface/88 shadow-soft backdrop-blur-sm",
        className,
      )}
    >
      <div className="border-b border-line px-4 py-3">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {eyebrow}
          </p>
        )}
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <span className="text-[11px] font-semibold tracking-[0.12em] text-muted">
            {String(sections.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      <ol className="divide-y divide-line">
        {sections.map((section, index) => {
          const isActive = activeSectionId === section.id;

          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={isActive ? "location" : undefined}
                className={cx(
                  "group flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-elevated/70",
                  isActive && "bg-coptic-soft/70 dark:bg-coptic-soft/35",
                )}
              >
                <span
                  className={cx(
                    "w-5 shrink-0 pt-0.5 text-[11px] font-semibold tracking-[0.08em] text-muted transition-colors group-hover:text-coptic",
                    isActive && "text-coptic",
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={cx(
                    "min-w-0 text-sm font-medium leading-5 text-muted transition-colors group-hover:text-coptic",
                    isActive && "text-coptic",
                  )}
                >
                  {section.title}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function GrammarLessonCard({
  children,
  className,
  tone = "neutral",
}: GrammarLessonCardProps) {
  return (
    <div
      className={cx(
        "rounded-lg border p-4",
        tone === "coptic"
          ? "border-coptic/20 bg-coptic-soft/55 dark:bg-coptic-soft/20"
          : "border-line bg-elevated/75",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function GrammarLessonTable({
  children,
  className,
  tableClassName,
  mobileMinWidthRem,
  hasStickyLeadingColumn = false,
  tableId,
  mobileLayout = "scroll",
}: GrammarLessonTableProps) {
  const { renderMode } = useGrammarLessonRenderContext();
  const { language } = useLanguage();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollHorizontally, setCanScrollHorizontally] = useState(false);
  const [isScrolledToStart, setIsScrolledToStart] = useState(true);
  const [isScrolledToEnd, setIsScrolledToEnd] = useState(true);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer || renderMode === "pdf") {
      return;
    }

    const updateScrollState = () => {
      const maxScrollLeft = Math.max(
        0,
        scrollContainer.scrollWidth - scrollContainer.clientWidth,
      );
      const canScroll = maxScrollLeft > 8;

      setCanScrollHorizontally(canScroll);
      setIsScrolledToStart(!canScroll || scrollContainer.scrollLeft <= 4);
      setIsScrolledToEnd(
        !canScroll || scrollContainer.scrollLeft >= maxScrollLeft - 4,
      );
    };

    const frame = window.requestAnimationFrame(updateScrollState);
    scrollContainer.addEventListener("scroll", updateScrollState, {
      passive: true,
    });

    let resizeObserver: ResizeObserver | undefined;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateScrollState();
      });
      resizeObserver.observe(scrollContainer);

      const tableElement = scrollContainer.querySelector("table");

      if (tableElement) {
        resizeObserver.observe(tableElement);
      }
    } else {
      window.addEventListener("resize", updateScrollState);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      scrollContainer.removeEventListener("scroll", updateScrollState);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [language, mobileMinWidthRem, renderMode]);

  let mobileScrollHint = "Veeg zijwaarts om te vergelijken";

  if (hasStickyLeadingColumn) {
    mobileScrollHint =
      language === "en"
        ? "Swipe sideways. Labels stay pinned."
        : "Veeg zijwaarts. Labels blijven staan.";
  } else if (language === "en") {
    mobileScrollHint = "Swipe sideways to compare";
  }
  const tableStyle =
    renderMode === "pdf" || !mobileMinWidthRem
      ? undefined
      : { minWidth: `max(100%, ${mobileMinWidthRem}rem)` };

  return (
    <div
      data-grammar-table-id={tableId}
      data-grammar-table-mobile-layout={mobileLayout}
      data-grammar-table-rendering="table"
      className={cx(
        "mt-4 -mx-4 overflow-hidden border border-line sm:mx-0 sm:rounded-lg",
        className,
      )}
    >
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className={cx(
            renderMode === "pdf"
              ? "overflow-visible"
              : "overflow-x-auto overscroll-x-contain touch-pan-x",
          )}
        >
          <table
            style={tableStyle}
            className={cx("w-full border-collapse text-left", tableClassName)}
          >
            {children}
          </table>
        </div>

        {renderMode !== "pdf" && canScrollHorizontally ? (
          <>
            {!hasStickyLeadingColumn && !isScrolledToStart ? (
              <div className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-surface via-surface/80 to-transparent sm:hidden" />
            ) : null}
            {!isScrolledToEnd ? (
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface via-surface/85 to-transparent sm:hidden" />
            ) : null}
          </>
        ) : null}
      </div>

      {renderMode !== "pdf" && canScrollHorizontally && isScrolledToStart ? (
        <div className="border-t border-line bg-elevated/80 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted sm:hidden">
          {mobileScrollHint}
        </div>
      ) : null}
    </div>
  );
}

type GrammarLessonEndnotesProps = {
  title: ReactNode;
  className?: string;
};

export function GrammarLessonEndnotes({
  title,
  className,
}: GrammarLessonEndnotesProps) {
  const { footnotes, renderMode } = useGrammarLessonRenderContext();

  if (renderMode !== "pdf" || footnotes.length === 0) {
    return null;
  }

  return (
    <section
      className={cx(
        "rounded-lg border border-line bg-surface/88 px-5 py-5 shadow-soft",
        className,
      )}
    >
      <h2 className="mb-4 text-2xl font-semibold text-ink">{title}</h2>
      <ol className="space-y-4">
        {footnotes.map((footnote) => (
          <li key={footnote.number} className="flex items-start gap-3">
            <span className="w-8 shrink-0 text-sm font-semibold text-coptic">
              [{footnote.number}]
            </span>
            <div className="min-w-0 text-sm leading-7 text-muted">
              {footnote.content}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
