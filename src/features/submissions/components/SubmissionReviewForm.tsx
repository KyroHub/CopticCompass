"use client";

import { submitFeedback } from "@/actions/admin";
import { Button } from "@/components/Button";
import { FormField, FormLabel } from "@/components/FormField";
import { useLanguage } from "@/components/LanguageProvider";
import type { SubmissionRow } from "@/features/submissions/types";

type SubmissionReviewFormProps = {
  submission: SubmissionRow;
};

const submissionReviewFormCopy = {
  en: {
    feedbackLabel: "Instructor Notes / Corrections:",
    feedbackPlaceholder: "Type your notes for the student...",
    saveUpdated: "Save Updated Feedback",
    scoreLabel: "Score (1-5):",
    submit: "Mark Reviewed & Send Feedback",
    title: "Evaluate Translation",
  },
  nl: {
    feedbackLabel: "Docentnotities / correcties:",
    feedbackPlaceholder: "Typ uw notities voor de student...",
    saveUpdated: "Bijgewerkte feedback opslaan",
    scoreLabel: "Score (1-5):",
    submit: "Als beoordeeld markeren en feedback sturen",
    title: "Vertaling beoordelen",
  },
} as const;

export function SubmissionReviewForm({
  submission,
}: SubmissionReviewFormProps) {
  const { language } = useLanguage();
  const copy = submissionReviewFormCopy[language];

  return (
    <form
      action={submitFeedback}
      className="space-y-6 rounded-lg border border-line bg-elevated/60 p-6"
    >
      <input type="hidden" name="submission_id" value={submission.id} />
      <h4 className="font-bold text-ink">{copy.title}</h4>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <FormLabel>{copy.scoreLabel}</FormLabel>
        <input
          type="number"
          name="rating"
          min="1"
          max="5"
          defaultValue={submission.rating ?? 5}
          required
          className="input-base h-auto w-24 px-4 py-2 text-center font-bold"
        />
      </div>

      <FormField label={copy.feedbackLabel}>
        <textarea
          name="feedback"
          rows={4}
          defaultValue={submission.feedback_text ?? ""}
          className="textarea-base min-h-0 resize-y px-5 py-4"
          placeholder={copy.feedbackPlaceholder}
          required
        />
      </FormField>

      <Button type="submit" fullWidth className="sm:w-auto" size="lg">
        {submission.status === "reviewed" ? copy.saveUpdated : copy.submit}
      </Button>
    </form>
  );
}
