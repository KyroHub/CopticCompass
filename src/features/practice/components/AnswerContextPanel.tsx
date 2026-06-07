"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { useLanguage } from "@/components/LanguageProvider";
import DialectSiglum from "@/features/dictionary/components/DialectSiglum";
import type { AppFlashcardCandidate } from "@/features/practice/lib/deckRegistry";
import {
  getAnswerContextMeanings,
  getCandidatePrimaryLink,
  isDictionaryFlashcardCandidate,
} from "@/features/practice/lib/practicePageHelpers";
import { cx } from "@/lib/classes";
import { antinoou } from "@/lib/fonts";

export function AnswerContextPanel({
  candidate,
}: {
  candidate: AppFlashcardCandidate;
}) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const contentId = useId();
  const meanings = getAnswerContextMeanings(candidate);
  const primaryLink = getCandidatePrimaryLink(candidate);
  const summaryTitle = isDictionaryFlashcardCandidate(candidate)
    ? candidate.metadata.copticText
    : candidate.metadata.lessonTitle;
  const summaryDetail = isDictionaryFlashcardCandidate(candidate)
    ? candidate.metadata.grammarText
    : candidate.metadata.focusText;

  return (
    <section className="mt-3 rounded-lg border border-line bg-elevated/70 text-left md:mt-4">
      <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
        <button
          type="button"
          aria-controls={contentId}
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((currentValue) => !currentValue)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
        >
          <ChevronDown
            className={cx(
              "h-4 w-4 shrink-0 text-muted transition-transform",
              isExpanded && "rotate-180",
            )}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-widest text-muted">
              {t("practice.saved.answerContext")}
            </span>
            <span className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-semibold text-ink">
              <span
                className={`${antinoou.className} max-w-full truncate text-base leading-5 text-coptic sm:max-w-40`}
              >
                {summaryTitle}
              </span>
              <span className="text-muted" aria-hidden="true">
                ·
              </span>
              <span className="min-w-0 max-w-full truncate">
                {summaryDetail}
              </span>
            </span>
          </span>
        </button>
        {primaryLink ? (
          <Link
            href={primaryLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start rounded-md px-3 py-2 text-xs font-semibold text-coptic transition-colors hover:bg-surface hover:text-coptic-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 sm:self-center"
          >
            {t(primaryLink.labelKey)}
          </Link>
        ) : null}
      </div>

      {isExpanded ? (
        <dl
          id={contentId}
          className="grid gap-2 border-t border-line px-4 py-3 text-xs sm:grid-cols-2 lg:grid-cols-4 md:text-sm"
        >
          {isDictionaryFlashcardCandidate(candidate) ? (
            <>
              <div>
                <dt className="font-semibold text-muted">
                  {t("practice.saved.contextHeadword")}
                </dt>
                <dd
                  className={`${antinoou.className} mt-1 truncate text-base leading-6 text-coptic md:text-lg`}
                >
                  {candidate.metadata.copticText}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-muted">
                  {t("practice.saved.contextDialect")}
                </dt>
                <dd className="mt-1 font-semibold text-ink">
                  {candidate.displayDialect ? (
                    <DialectSiglum siglum={candidate.displayDialect} />
                  ) : (
                    candidate.selectedDialect
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-muted">
                  {t("practice.saved.contextGrammar")}
                </dt>
                <dd className="mt-1 truncate font-semibold text-ink">
                  {candidate.metadata.grammarText}
                </dd>
              </div>
            </>
          ) : (
            <>
              <div>
                <dt className="font-semibold text-muted">
                  {t("practice.saved.contextSource")}
                </dt>
                <dd className="mt-1 truncate font-semibold text-ink">
                  {candidate.metadata.lessonTitle}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-muted">
                  {t("practice.saved.contextFocus")}
                </dt>
                <dd className="mt-1 truncate font-semibold text-ink">
                  {candidate.metadata.focusText}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-muted">
                  {t("practice.saved.contextGrammar")}
                </dt>
                <dd className="mt-1 truncate font-semibold text-ink">
                  {t(candidate.metadata.templateLabelKey)}
                </dd>
              </div>
            </>
          )}
          <div>
            <dt className="font-semibold text-muted">
              {t("practice.saved.contextMeaning")}
            </dt>
            <dd className="mt-1 line-clamp-2 font-semibold text-ink">
              {meanings.length > 0
                ? meanings.join("; ")
                : t("practice.saved.contextMeaningUnavailable")}
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
