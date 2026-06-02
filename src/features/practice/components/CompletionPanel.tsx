"use client";

import { AlertTriangle, BookOpen, LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/Badge";
import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import type { PracticeReviewOutcome } from "@/features/practice/lib/practiceSessionTypes";
import { getDashboardPath, getDictionaryPath } from "@/lib/locale";

export function CompletionPanel({
  onPracticeWeak,
  reviews,
  weakReviewCount,
}: {
  onPracticeWeak: () => void;
  reviews: readonly PracticeReviewOutcome[];
  weakReviewCount: number;
}) {
  const { language, t } = useLanguage();
  const solidReviewCount = reviews.length - weakReviewCount;

  return (
    <div className="rounded-lg border border-line bg-surface/92 p-6 shadow-soft backdrop-blur-sm md:p-8">
      <Badge tone="coptic" size="sm">
        {t("practice.saved.completeTitle")}
      </Badge>
      <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-ink">
        {t("practice.saved.completeDescription")}
      </h2>
      <p className="mt-4 text-sm leading-6 text-muted">
        {t("practice.saved.reviewed")}: {reviews.length}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          [t("practice.saved.solidAnswers"), solidReviewCount],
          [t("practice.saved.needsPractice"), weakReviewCount],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-line bg-elevated/70 px-4 py-3"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {weakReviewCount > 0 ? (
          <button
            type="button"
            onClick={onPracticeWeak}
            className={buttonClassName({ variant: "primary" })}
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {t("practice.saved.practiceWeak")}
          </button>
        ) : null}
        <Link
          href={getDashboardPath(language)}
          className={buttonClassName({
            variant: weakReviewCount > 0 ? "secondary" : "primary",
          })}
        >
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          {t("practice.saved.openDashboard")}
        </Link>
        <Link
          href={getDictionaryPath(language)}
          className={buttonClassName({ variant: "secondary" })}
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          {t("practice.saved.openDictionary")}
        </Link>
      </div>
    </div>
  );
}
