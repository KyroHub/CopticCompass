import Link from "next/link";

import { Badge } from "@/components/Badge";
import { buttonClassName } from "@/components/Button";
import { SurfacePanel } from "@/components/SurfacePanel";
import {
  formatDashboardDate,
  getDashboardCopy,
} from "@/features/dashboard/lib/dashboardCopy";
import {
  buildGrammarLearnerDashboardStats,
  type GrammarLessonLearnerSummary,
} from "@/features/grammar/lib/grammarLearnerState";
import { getGrammarLessonPath } from "@/features/grammar/lib/grammarPaths";
import type { Language } from "@/types/i18n";

type GrammarDashboardOverviewProps = {
  language: Language;
  lessonSummaries: readonly GrammarLessonLearnerSummary[];
};

export function GrammarDashboardOverview({
  language,
  lessonSummaries,
}: GrammarDashboardOverviewProps) {
  const stats = buildGrammarLearnerDashboardStats(lessonSummaries);
  const copy = getDashboardCopy(language);
  const lastViewedLabel = (summary: GrammarLessonLearnerSummary) => {
    if (!summary.lastViewedAt) {
      return copy.grammar.notStartedYet;
    }

    const formattedDate = formatDashboardDate(summary.lastViewedAt, language);
    return language === "nl"
      ? `Laatst bekeken op ${formattedDate}`
      : `Last visited on ${formattedDate}`;
  };

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight text-ink">
          {copy.grammar.title}
        </h3>
        <p className="mt-2 text-muted">{copy.grammar.description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [copy.grammar.publishedLessons, stats.totalLessons],
          [copy.grammar.startedLessons, stats.startedLessons],
          [copy.grammar.completedLessons, stats.completedLessons],
          [
            copy.grammar.savedLessons,
            stats.bookmarkedLessons + stats.notedLessons,
          ],
        ].map(([label, value]) => (
          <SurfacePanel key={label} rounded="lg" shadow="soft" className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {label}
            </p>
            <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
          </SurfacePanel>
        ))}
      </div>

      <div className="grid gap-4">
        {lessonSummaries.map((summary) => {
          const lessonHref = summary.nextSectionId
            ? `${getGrammarLessonPath(summary.lessonSlug, language)}#${summary.nextSectionId}`
            : getGrammarLessonPath(summary.lessonSlug, language);

          return (
            <SurfacePanel
              key={summary.lessonId}
              rounded="lg"
              shadow="soft"
              className="p-6 md:p-7"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge tone="accent" size="xs">
                      {String(summary.lessonNumber).padStart(2, "0")}
                    </Badge>
                    {summary.isCompleted ? (
                      <Badge tone="surface" size="xs">
                        {copy.grammar.completedBadge}
                      </Badge>
                    ) : null}
                    {summary.isBookmarked ? (
                      <Badge tone="surface" size="xs">
                        {copy.grammar.savedBadge}
                      </Badge>
                    ) : null}
                    {summary.hasNotes ? (
                      <Badge tone="surface" size="xs">
                        {copy.grammar.notesBadge}
                      </Badge>
                    ) : null}
                  </div>

                  <h4 className="text-xl font-semibold text-ink">
                    {summary.lessonTitle[language]}
                  </h4>

                  <div className="mt-4 max-w-xl">
                    <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                      <span className="font-medium text-muted">
                        {language === "nl"
                          ? `${summary.completedSections} van ${summary.totalSections} onderdelen voltooid`
                          : `${summary.completedSections} of ${summary.totalSections} sections complete`}
                      </span>
                      <span className="font-semibold text-coptic">
                        {summary.progressPercent}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-elevated">
                      <div
                        className="h-2 rounded-full bg-coptic transition-all"
                        style={{ width: `${summary.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-muted">
                    {lastViewedLabel(summary)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
                  {summary.nextSectionTitle ? (
                    <p className="text-sm text-muted">
                      {language === "nl" ? "Volgende:" : "Next up:"}{" "}
                      {summary.nextSectionTitle[language]}
                    </p>
                  ) : null}
                  <Link
                    href={lessonHref}
                    className={buttonClassName({ className: "px-5" })}
                  >
                    {summary.isStarted
                      ? copy.grammar.continueLesson
                      : copy.grammar.startLesson}
                  </Link>
                </div>
              </div>
            </SurfacePanel>
          );
        })}
      </div>
    </section>
  );
}
