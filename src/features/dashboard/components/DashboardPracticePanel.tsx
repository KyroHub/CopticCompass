import { ArrowRight, BookOpenCheck, Clock3, Layers3 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/Badge";
import { buttonClassName } from "@/components/Button";
import { StatusNotice } from "@/components/StatusNotice";
import { SurfacePanel } from "@/components/SurfacePanel";
import {
  formatDashboardDate,
  getDashboardCopy,
} from "@/features/dashboard/lib/dashboardCopy";
import type { SavedEntriesPracticeStats } from "@/features/practice/lib/savedEntriesDeck";
import { getPracticePath } from "@/lib/locale";
import type { Language } from "@/types/i18n";

type DashboardPracticePanelProps = {
  language: Language;
  nextDueAt: string | null;
  stats: SavedEntriesPracticeStats;
  storageError: { message: string } | null;
};

function PracticeStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpenCheck;
  label: string;
  value: number;
}) {
  return (
    <SurfacePanel rounded="lg" className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {label}
        </p>
        <Icon className="h-4 w-4 text-accent-strong" aria-hidden="true" />
      </div>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
    </SurfacePanel>
  );
}

export function DashboardPracticePanel({
  language,
  nextDueAt,
  stats,
  storageError,
}: DashboardPracticePanelProps) {
  const copy = getDashboardCopy(language);
  const nextDueDate = formatDashboardDate(nextDueAt, language);
  const hasSavedItems = stats.totalSourceEntries > 0;
  const preferredStudyMode = stats.dueCards > 0 ? "review" : "learn";
  let reviewDeckLabel: string = copy.practice.reviewDeck;

  if (stats.dueCards > 0) {
    reviewDeckLabel = copy.practice.reviewDueCards;
  } else if (stats.newCards > 0) {
    reviewDeckLabel = copy.practice.learnNewCards;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="coptic" size="xs">
              {copy.practice.title}
            </Badge>
            <Badge tone="surface" size="xs">
              {nextDueDate
                ? `${copy.practice.nextDuePrefix}: ${nextDueDate}`
                : copy.practice.caughtUp}
            </Badge>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-ink">
            {copy.practice.title}
          </h3>
          <p className="mt-2 max-w-3xl text-muted">
            {copy.practice.description}
          </p>
        </div>

        <Link
          href={`${getPracticePath(language)}?mode=${preferredStudyMode}`}
          className={buttonClassName({
            className: "shrink-0",
            variant: "primary",
          })}
        >
          <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
          {reviewDeckLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {storageError ? (
        <StatusNotice
          align="left"
          tone="info"
          title={copy.practice.storagePendingTitle}
        >
          {copy.practice.storagePendingDescription}
        </StatusNotice>
      ) : null}

      {!hasSavedItems ? (
        <StatusNotice align="left" dashed title={copy.practice.noSavedTitle}>
          {copy.practice.noSavedDescription}
        </StatusNotice>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <PracticeStat
            icon={BookOpenCheck}
            label={copy.practice.dueCards}
            value={stats.dueCards}
          />
          <PracticeStat
            icon={Layers3}
            label={copy.practice.newCards}
            value={stats.newCards}
          />
          <PracticeStat
            icon={Clock3}
            label={copy.practice.scheduledCards}
            value={stats.scheduledCards}
          />
        </div>
      )}
    </section>
  );
}
