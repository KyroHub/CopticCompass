"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  NotebookPen,
} from "lucide-react";
import Link from "next/link";

import { AuthGateNotice } from "@/components/AuthGateNotice";
import { Badge } from "@/components/Badge";
import { buttonClassName } from "@/components/Button";
import { SkeletonBlock } from "@/components/SkeletonBlock";
import { SurfacePanel, surfacePanelClassName } from "@/components/SurfacePanel";
import type { GrammarLessonLearnerSummary } from "@/features/grammar/lib/grammarLearnerState";
import { cx } from "@/lib/classes";
import { getDashboardPath } from "@/lib/locale";
import type { Language } from "@/types/i18n";

export type GrammarAdjacentLessonLink = {
  href: string;
  number: number;
  title: string;
};

type GrammarLessonLearnerPanelProps = {
  errorMessage: string | null;
  isBookmarkPending: boolean;
  language: Language;
  onToggleBookmark: () => Promise<void>;
  status: "loading" | "ready" | "signed-out" | "unavailable";
  summary: GrammarLessonLearnerSummary;
};

type GrammarLessonNotesPanelProps = {
  errorMessage: string | null;
  hasUnsavedNoteChanges: boolean;
  isNotePending: boolean;
  language: Language;
  noteText: string;
  noteUpdatedAt: string | null;
  onSaveNote: () => Promise<void>;
  onNoteChange: (value: string) => void;
  status: "loading" | "ready" | "signed-out" | "unavailable";
};

type GrammarLessonNavigationPanelProps = {
  language: Language;
  nextLesson: GrammarAdjacentLessonLink | null;
  previousLesson: GrammarAdjacentLessonLink | null;
};

function formatProgressLabel(
  language: Language,
  summary: GrammarLessonLearnerSummary,
) {
  if (language === "nl") {
    return `${summary.completedSections} van ${summary.totalSections} paragrafen afgerond`;
  }

  return `${summary.completedSections} of ${summary.totalSections} sections completed`;
}

function formatSavedDate(language: Language, value: string | null) {
  if (!value) {
    return null;
  }

  const formatted = new Date(value).toLocaleDateString();
  return language === "nl"
    ? `Laatst bijgewerkt op ${formatted}`
    : `Last updated on ${formatted}`;
}

export function GrammarLessonLearnerPanel({
  errorMessage,
  isBookmarkPending,
  language,
  onToggleBookmark,
  status,
  summary,
}: GrammarLessonLearnerPanelProps) {
  if (status === "unavailable") {
    return null;
  }

  if (status === "loading") {
    return <SkeletonBlock className="h-40 shadow-soft" />;
  }

  if (status === "signed-out") {
    return (
      <AuthGateNotice
        actionClassName="px-5"
        actionLabel={language === "nl" ? "Inloggen" : "Sign in"}
        size="comfortable"
        tone="info"
      >
        {language === "nl"
          ? "Meld u aan om uw voortgang, bladwijzers en lesnotities op te slaan."
          : "Sign in to save your progress, bookmarks, and lesson notes."}
      </AuthGateNotice>
    );
  }

  const lastViewedLabel = summary.lastViewedAt
    ? (() => {
        const formattedDate = new Date(
          summary.lastViewedAt,
        ).toLocaleDateString();
        return language === "nl"
          ? `Laatst geopend op ${formattedDate}`
          : `Last opened on ${formattedDate}`;
      })()
    : null;
  let bookmarkLabel = language === "nl" ? "Les opslaan" : "Save lesson";

  if (summary.isBookmarked) {
    bookmarkLabel = language === "nl" ? "Opgeslagen" : "Saved";
  }

  return (
    <SurfacePanel as="section" shadow="soft" className="overflow-hidden">
      <div className="border-b border-line px-4 py-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {language === "nl" ? "Studietracking" : "Study tracking"}
        </p>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-ink">
            {language === "nl" ? "Uw voortgang" : "Your progress"}
          </h2>
          {summary.isCompleted ? (
            <Badge tone="accent" size="xs">
              {language === "nl" ? "Voltooid" : "Completed"}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="space-y-3.5 px-4 py-3.5">
        <div>
          <div className="mb-2 flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-muted">
              {formatProgressLabel(language, summary)}
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

        <div className="flex flex-wrap gap-2">
          {summary.isStarted ? (
            <Badge tone="surface" size="xs">
              {language === "nl" ? "Gestart" : "Started"}
            </Badge>
          ) : null}
          {summary.isBookmarked ? (
            <Badge tone="surface" size="xs">
              {language === "nl" ? "Opgeslagen" : "Saved"}
            </Badge>
          ) : null}
          {summary.hasNotes ? (
            <Badge tone="surface" size="xs">
              {language === "nl" ? "Met notities" : "Has notes"}
            </Badge>
          ) : null}
        </div>

        {lastViewedLabel ? (
          <p className="text-xs text-muted">{lastViewedLabel}</p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void onToggleBookmark();
            }}
            disabled={isBookmarkPending}
            className={buttonClassName({
              className: "min-h-10 px-3.5 py-2 text-sm",
              size: "sm",
              variant: summary.isBookmarked ? "primary" : "secondary",
            })}
          >
            <Bookmark className="h-4 w-4" />
            {bookmarkLabel}
          </button>
          <Link
            href={getDashboardPath(language)}
            className={buttonClassName({
              className: "px-3.5 text-sm",
              variant: "secondary",
            })}
          >
            {language === "nl" ? "Dashboard" : "Dashboard"}
          </Link>
        </div>

        {errorMessage ? (
          <p className="text-sm text-danger">{errorMessage}</p>
        ) : null}
      </div>
    </SurfacePanel>
  );
}

function LessonNavigationCard({
  className,
  direction,
  language,
  lesson,
}: {
  className?: string;
  direction: "previous" | "next";
  language: Language;
  lesson: GrammarAdjacentLessonLink | null;
}) {
  const isPrevious = direction === "previous";
  const Icon = isPrevious ? ArrowLeft : ArrowRight;
  let eyebrow = isPrevious ? "Previous lesson" : "Next lesson";

  if (language === "nl") {
    eyebrow = isPrevious ? "Vorige les" : "Volgende les";
  }
  const unavailableLabel =
    language === "nl" ? "Niet beschikbaar" : "Unavailable";

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            {eyebrow}
          </p>
          <p
            className={cx(
              "line-clamp-2 text-sm font-semibold",
              lesson ? "text-ink" : "text-muted/65",
            )}
          >
            {lesson
              ? `${language === "nl" ? "Les" : "Lesson"} ${lesson.number}: ${lesson.title}`
              : unavailableLabel}
          </p>
        </div>
        <Icon
          className={cx(
            "mt-0.5 h-4 w-4 shrink-0",
            lesson ? "text-coptic" : "text-muted/45",
          )}
        />
      </div>
    </>
  );

  if (!lesson) {
    return (
      <div
        className={cx(
          "rounded-lg border border-line bg-elevated/70 px-3.5 py-3 opacity-70",
          className,
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={lesson.href}
      className={surfacePanelClassName({
        variant: "default",
        className: cx(
          "px-3.5 py-3 transition-all duration-200 hover:-translate-y-px hover:border-coptic/35 hover:bg-coptic-soft/45",
          className,
        ),
      })}
    >
      {content}
    </Link>
  );
}

export function GrammarLessonNavigationPanel({
  language,
  nextLesson,
  previousLesson,
}: GrammarLessonNavigationPanelProps) {
  return (
    <SurfacePanel as="section" shadow="soft" className="overflow-hidden">
      <div className="border-b border-line px-4 py-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {language === "nl" ? "Navigatie" : "Navigation"}
        </p>
        <h2 className="text-base font-semibold text-ink">
          {language === "nl" ? "Andere lessen" : "Other lessons"}
        </h2>
      </div>

      <div className="grid gap-3 px-4 py-3.5">
        <LessonNavigationCard
          direction="previous"
          language={language}
          lesson={previousLesson}
        />
        <LessonNavigationCard
          direction="next"
          language={language}
          lesson={nextLesson}
        />
      </div>
    </SurfacePanel>
  );
}

export function GrammarLessonBottomNavigation({
  language,
  nextLesson,
  previousLesson,
}: GrammarLessonNavigationPanelProps) {
  return (
    <section className="mt-10 border-t border-line pt-8">
      <div className="mb-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {language === "nl" ? "Vervolg" : "Continue"}
        </p>
        <h2 className="text-xl font-semibold text-ink">
          {language === "nl"
            ? "Navigeer tussen lessen"
            : "Move between lessons"}
        </h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <LessonNavigationCard
          className="h-full"
          direction="previous"
          language={language}
          lesson={previousLesson}
        />
        <LessonNavigationCard
          className="h-full"
          direction="next"
          language={language}
          lesson={nextLesson}
        />
      </div>
    </section>
  );
}

export function GrammarLessonSectionProgressButton({
  isCompleted,
  isPending,
  language,
  onToggle,
}: {
  isCompleted: boolean;
  isPending: boolean;
  language: Language;
  onToggle: () => Promise<void>;
}) {
  let buttonLabel =
    language === "nl" ? "Markeer als voltooid" : "Mark as completed";

  if (isCompleted) {
    buttonLabel =
      language === "nl" ? "Paragraaf voltooid" : "Section completed";
  }

  return (
    <button
      type="button"
      onClick={() => {
        void onToggle();
      }}
      disabled={isPending}
      className={buttonClassName({
        className: cx(
          "h-auto px-4 py-2",
          isCompleted &&
            "border-coptic/25 bg-coptic-soft text-coptic hover:border-coptic/35 hover:bg-coptic-soft hover:text-coptic",
        ),
        size: "sm",
        variant: "secondary",
      })}
    >
      <CheckCircle2 className="h-4 w-4" />
      {buttonLabel}
    </button>
  );
}

export function GrammarLessonNotesPanel({
  errorMessage,
  hasUnsavedNoteChanges,
  isNotePending,
  language,
  noteText,
  noteUpdatedAt,
  onSaveNote,
  onNoteChange,
  status,
}: GrammarLessonNotesPanelProps) {
  if (status !== "ready") {
    return null;
  }

  let saveNoteLabel = language === "nl" ? "Notities opslaan" : "Save notes";

  if (isNotePending) {
    saveNoteLabel = language === "nl" ? "Opslaan..." : "Saving...";
  }

  return (
    <SurfacePanel as="section" shadow="soft" className="overflow-hidden">
      <div className="border-b border-line px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-coptic-soft text-coptic">
            <NotebookPen className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {language === "nl" ? "Persoonlijk" : "Personal"}
            </p>
            <h2 className="text-xl font-semibold text-ink">
              {language === "nl" ? "Lesnotities" : "Lesson notes"}
            </h2>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-6 py-5">
        <p className="text-sm leading-7 text-muted">
          {language === "nl"
            ? "Bewaar hier uw eigen aantekeningen bij deze les. Ze blijven gekoppeld aan dit les-ID in uw dashboard."
            : "Keep your own notes for this lesson here. They stay attached to this lesson id in your dashboard."}
        </p>

        <textarea
          value={noteText}
          onChange={(event) => onNoteChange(event.target.value)}
          rows={6}
          className="input-base min-h-[10rem] w-full resize-y px-4 py-3 text-base font-sans"
          placeholder={
            language === "nl"
              ? "Schrijf hier uw samenvatting, vragen of geheugensteuntjes..."
              : "Write your summary, questions, or memory aids here..."
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {formatSavedDate(language, noteUpdatedAt) ??
              (language === "nl"
                ? "Nog geen notities opgeslagen"
                : "No saved notes yet")}
          </p>
          <button
            type="button"
            onClick={() => {
              void onSaveNote();
            }}
            disabled={isNotePending || !hasUnsavedNoteChanges}
            className={buttonClassName({ className: "px-5" })}
          >
            {saveNoteLabel}
          </button>
        </div>

        {errorMessage ? (
          <p className="text-sm text-danger">{errorMessage}</p>
        ) : null}
      </div>
    </SurfacePanel>
  );
}
