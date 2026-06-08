"use client";

import { ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useRef } from "react";

import { deleteSubmission } from "@/actions/admin";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ElevatedPanel } from "@/components/ElevatedPanel";
import { useLanguage } from "@/components/LanguageProvider";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import { adminReviewQueueItemClassName } from "@/features/admin/components/adminControlStyles";
import { SubmissionReviewForm } from "@/features/submissions/components/SubmissionReviewForm";
import { SubmissionStatusBadge } from "@/features/submissions/components/SubmissionStatusBadge";
import type { AdminSubmission } from "@/features/submissions/types";
import {
  formatLessonSlug,
  formatSubmissionDate,
} from "@/features/submissions/utils";
import { cx } from "@/lib/classes";
import type { Language } from "@/types/i18n";

const adminSubmissionReviewWorkspaceCopy = {
  en: {
    deleteConfirm:
      "Remove this submission from the student and admin views? Use this for accidental duplicates or test submissions.",
    deleteDescription:
      "This is a soft delete: the row stays in the database for audit purposes, but it disappears from the student dashboard and the instructor queues.",
    deleteTitle: "Remove duplicate or test submission",
    graded: "Graded",
    intro:
      "Keep the queue compact on the left, then review and score the selected submission in a focused panel without expanding every card inline.",
    needsReview: "Needs Review",
    open: "Open",
    panelDescription:
      "The queue stays compact on the left while the full submission and grading form stay focused here.",
    panelTitle: "Select a submission to review.",
    removeSubmission: "Remove submission",
    review: "Review",
    student: "Student",
    submittedOn: "Submitted on",
    unknownUser: "Unknown user",
  },
  nl: {
    deleteConfirm:
      "Deze inzending verwijderen uit de studenten- en adminweergave? Gebruik dit voor toevallige duplicaten of testinzendingen.",
    deleteDescription:
      "Dit is een zachte verwijdering: de rij blijft in de database voor auditdoeleinden, maar verdwijnt uit het studentendashboard en de docentwachtrijen.",
    deleteTitle: "Dubbele of testinzending verwijderen",
    graded: "Beoordeeld",
    intro:
      "Houd de wachtrij compact links en beoordeel de geselecteerde inzending in een gefocust paneel zonder elke kaart inline uit te klappen.",
    needsReview: "Te beoordelen",
    open: "Open",
    panelDescription:
      "De wachtrij blijft compact links, terwijl de volledige inzending en het beoordelingsformulier hier gefocust blijven.",
    panelTitle: "Selecteer een inzending om te beoordelen.",
    removeSubmission: "Inzending verwijderen",
    review: "Beoordelen",
    student: "Student",
    submittedOn: "Ingediend op",
    unknownUser: "Onbekende gebruiker",
  },
} as const;

function getSubmissionStatusLabel({
  copy,
  rating,
}: {
  copy: (typeof adminSubmissionReviewWorkspaceCopy)[Language];
  rating: number | null;
}) {
  return rating ? `${copy.graded} · ${rating}/5` : copy.graded;
}

function buildPreview(text: string, maxLength = 160) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function buildSubmissionHref(
  pathname: string,
  searchParamsString: string,
  submissionId: string,
) {
  const nextParams = new URLSearchParams(searchParamsString);
  nextParams.set("submission", submissionId);
  const nextQuery = nextParams.toString();

  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function AdminSubmissionQueueItem({
  active,
  copy,
  language,
  onSelect,
  submission,
}: {
  active: boolean;
  copy: (typeof adminSubmissionReviewWorkspaceCopy)[Language];
  language: Language;
  onSelect: () => void;
  submission: AdminSubmission;
}) {
  const preview = buildPreview(submission.submitted_text);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={adminReviewQueueItemClassName({ active })}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            {submission.status === "reviewed" ? (
              <SubmissionStatusBadge
                label={getSubmissionStatusLabel({
                  copy,
                  rating: submission.rating,
                })}
                tone="reviewed"
              />
            ) : (
              <SubmissionStatusBadge label={copy.needsReview} tone="pending" />
            )}
          </div>

          <h3 className="mt-3 text-lg font-semibold text-ink">
            {formatLessonSlug(submission.lesson_slug)}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            <span className="font-medium text-ink">
              {copy.student}: {submission.studentEmail || copy.unknownUser}
            </span>
            <span>
              {copy.submittedOn}{" "}
              {formatSubmissionDate(submission.created_at, language)}
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-muted">{preview}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2 pt-1 text-sm font-medium text-muted">
          <span className="hidden sm:inline">
            {active ? copy.open : copy.review}
          </span>
          <ChevronRight
            className={cx(
              "h-5 w-5 transition-transform duration-200",
              active
                ? "translate-x-0.5 text-accent-strong dark:text-accent"
                : "",
            )}
          />
        </div>
      </div>
    </button>
  );
}

function AdminSubmissionReviewPanel({
  copy,
  language,
  submission,
}: {
  copy: (typeof adminSubmissionReviewWorkspaceCopy)[Language];
  language: Language;
  submission: AdminSubmission | null;
}) {
  if (!submission) {
    return (
      <div
        className={surfacePanelClassName({
          rounded: "lg",
          variant: "subtle",
          className:
            "flex min-h-[20rem] items-center justify-center p-8 text-center",
        })}
      >
        <div className="space-y-3">
          <p className="text-base font-semibold text-ink">{copy.panelTitle}</p>
          <p className="max-w-sm text-sm leading-6 text-muted">
            {copy.panelDescription}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={surfacePanelClassName({
        rounded: "lg",
        variant: "elevated",
        shadow: "float",
        className:
          "overflow-hidden xl:max-h-[calc(100vh-8.5rem)] xl:overflow-y-auto",
      })}
    >
      <div className="border-b border-line px-6 py-5 md:px-7">
        <div className="flex flex-wrap gap-2">
          {submission.status === "reviewed" ? (
            <SubmissionStatusBadge
              label={getSubmissionStatusLabel({
                copy,
                rating: submission.rating,
              })}
              tone="reviewed"
            />
          ) : (
            <SubmissionStatusBadge label={copy.needsReview} tone="pending" />
          )}
          <Badge tone="surface" size="xs">
            {submission.studentEmail || copy.unknownUser}
          </Badge>
        </div>

        <h3 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
          {formatLessonSlug(submission.lesson_slug)}
        </h3>

        <p className="mt-2 text-sm leading-6 text-muted">
          {copy.submittedOn}{" "}
          {formatSubmissionDate(submission.created_at, language)}
        </p>
      </div>

      <div className="space-y-6 px-6 py-6 md:px-7">
        <div
          className={surfacePanelClassName({
            rounded: "lg",
            variant: "elevated",
            className:
              "whitespace-pre-wrap p-5 font-coptic text-lg text-muted md:text-xl",
          })}
        >
          {submission.submitted_text}
        </div>

        <SubmissionReviewForm submission={submission} />

        <form
          action={deleteSubmission}
          className="rounded-lg border border-danger/25 bg-danger/5 p-5 dark:bg-danger/10"
          onSubmit={(event) => {
            if (!window.confirm(copy.deleteConfirm)) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="submission_id" value={submission.id} />
          <input
            type="hidden"
            name="lesson_slug"
            value={submission.lesson_slug}
          />
          <input
            type="hidden"
            name="deletion_reason"
            value="duplicate_submission"
          />

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-danger">
                {copy.deleteTitle}
              </p>
              <p className="text-sm leading-6 text-danger">
                {copy.deleteDescription}
              </p>
            </div>

            <Button
              type="submit"
              variant="secondary"
              className="border-danger/25 bg-surface text-danger hover:bg-danger/5 dark:bg-danger/10 dark:hover:bg-danger/15"
            >
              {copy.removeSubmission}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminSubmissionReviewWorkspace({
  submissions,
}: {
  submissions: AdminSubmission[];
}) {
  const { language } = useLanguage();
  const copy = adminSubmissionReviewWorkspaceCopy[language];
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const searchParamSelection = searchParams.get("submission");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const selectedSubmission =
    submissions.find((submission) => submission.id === searchParamSelection) ??
    submissions[0] ??
    null;

  function handleSelect(submissionId: string) {
    startTransition(() => {
      router.replace(
        buildSubmissionHref(pathname, searchParamsString, submissionId),
        { scroll: false },
      );
    });

    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      window.requestAnimationFrame(() => {
        panelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }

  return (
    <div className="space-y-5">
      <ElevatedPanel className="p-4 text-sm leading-6 text-muted">
        {copy.intro}
      </ElevatedPanel>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(22rem,30rem)]">
        <div className="space-y-3">
          {submissions.map((submission) => (
            <AdminSubmissionQueueItem
              key={submission.id}
              active={submission.id === selectedSubmission?.id}
              copy={copy}
              language={language}
              onSelect={() => handleSelect(submission.id)}
              submission={submission}
            />
          ))}
        </div>

        <div ref={panelRef} className="xl:sticky xl:top-28 xl:self-start">
          <AdminSubmissionReviewPanel
            copy={copy}
            language={language}
            submission={selectedSubmission}
          />
        </div>
      </div>
    </div>
  );
}
