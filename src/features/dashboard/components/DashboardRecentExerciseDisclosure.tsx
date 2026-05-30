import { ChevronDown } from "lucide-react";

import { surfacePanelClassName } from "@/components/SurfacePanel";
import { SubmissionFeedbackPanel } from "@/features/submissions/components/SubmissionFeedbackPanel";
import type { SubmissionRow } from "@/features/submissions/types";
import {
  formatLessonSlug,
  formatSubmissionDate,
} from "@/features/submissions/utils";
import type { Language } from "@/types/i18n";

import { getDashboardCopy } from "../lib/dashboardCopy";

export function DashboardRecentExerciseDisclosure({
  defaultOpen = false,
  locale,
  submission,
}: {
  defaultOpen?: boolean;
  locale: Language;
  submission: SubmissionRow;
}) {
  const copy = getDashboardCopy(locale);

  return (
    <details
      className={surfacePanelClassName({
        rounded: "lg",
        variant: "elevated",
        className: "group overflow-hidden",
      })}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-6 [&::-webkit-details-marker]:hidden md:p-8">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="truncate text-xl font-semibold uppercase tracking-wide text-ink md:text-2xl">
              {formatLessonSlug(submission.lesson_slug)}
            </h4>
            {submission.status === "reviewed" ? (
              <span className="rounded-full bg-coptic-soft px-3 py-1 text-xs font-bold text-coptic">
                {copy.reviewedLabel}
                {submission.rating ? ` · ${submission.rating} / 5` : ""}
              </span>
            ) : (
              <span className="rounded-full bg-elevated px-3 py-1 text-xs font-semibold text-muted">
                {copy.submissions.awaitingReviewLabel}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
            <span className="rounded-lg bg-elevated px-3 py-1 text-xs font-semibold text-muted">
              {formatSubmissionDate(submission.created_at, locale)}
            </span>
            <span className="group-open:hidden">
              {copy.submissions.showDetails}
            </span>
            <span className="hidden group-open:inline">
              {copy.submissions.hideDetails}
            </span>
          </div>
        </div>

        <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <div className="border-t border-line px-6 pb-6 pt-6 md:px-8 md:pb-8 md:pt-7">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {copy.submissions.responseLabel}
        </div>

        <div className="mb-6 rounded-lg border border-line bg-elevated p-5 whitespace-pre-wrap font-coptic text-lg text-muted md:text-xl">
          {submission.submitted_text}
        </div>

        <SubmissionFeedbackPanel language={locale} submission={submission} />
      </div>
    </details>
  );
}
