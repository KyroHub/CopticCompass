"use client";

import { useMemo } from "react";

import { useLanguage } from "@/components/LanguageProvider";
import { SurfacePanel } from "@/components/SurfacePanel";
import { RATING_OPTIONS } from "@/features/practice/components/practicePageOptions";
import { getRatingCounts } from "@/features/practice/lib/practicePageHelpers";
import type { PracticeReviewOutcome } from "@/features/practice/lib/practiceSessionTypes";
import { cx } from "@/lib/classes";

export function PracticeProgressPanel({
  currentPosition,
  reviews,
  totalCards,
}: {
  currentPosition: number;
  reviews: readonly PracticeReviewOutcome[];
  totalCards: number;
}) {
  const { t } = useLanguage();
  const reviewedCount = reviews.length;
  const progressPercent =
    totalCards === 0 ? 0 : Math.round((reviewedCount / totalCards) * 100);
  const ratingCounts = useMemo(() => getRatingCounts(reviews), [reviews]);

  return (
    <SurfacePanel as="aside" shadow="soft" className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
          {t("practice.saved.progress")}
        </h2>
      </div>

      <div
        className="h-2 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label={t("practice.saved.progress")}
        aria-valuemin={0}
        aria-valuemax={totalCards}
        aria-valuenow={reviewedCount}
      >
        <div
          className="h-full rounded-full bg-coptic transition-[width] duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-line bg-elevated/70 px-3 py-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-muted">
            {t("practice.saved.cardCount")}
          </p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {currentPosition}/{totalCards}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-elevated/70 px-3 py-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-muted">
            {t("practice.saved.reviewed")}
          </p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {reviewedCount}/{totalCards}
          </p>
        </div>
      </div>

      {reviewedCount > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {RATING_OPTIONS.map((option) => {
            const Icon = option.icon;

            return (
              <div
                key={option.rating}
                className={cx(
                  "flex min-h-12 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm font-semibold",
                  option.toneClassName,
                )}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{t(option.translationKey)}</span>
                </span>
                <span>{ratingCounts[option.rating]}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </SurfacePanel>
  );
}

export function MobileReviewProgress({
  currentPosition,
  reviews,
  totalCards,
}: {
  currentPosition: number;
  reviews: readonly PracticeReviewOutcome[];
  totalCards: number;
}) {
  const { t } = useLanguage();
  const reviewedCount = reviews.length;
  const progressPercent =
    totalCards === 0 ? 0 : Math.round((reviewedCount / totalCards) * 100);

  return (
    <div className="mb-3 px-1 md:hidden">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted">
        <span>
          {t("practice.saved.cardCount")} {currentPosition}/{totalCards}
        </span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label={t("practice.saved.progress")}
        aria-valuemin={0}
        aria-valuemax={totalCards}
        aria-valuenow={reviewedCount}
      >
        <div
          className="h-full rounded-full bg-coptic transition-[width] duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
