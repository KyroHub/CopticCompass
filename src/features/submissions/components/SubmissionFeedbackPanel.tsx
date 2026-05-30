import { Badge } from "@/components/Badge";
import { StatusNotice } from "@/components/StatusNotice";
import { getDashboardCopy } from "@/features/dashboard/lib/dashboardCopy";
import type { SubmissionRow } from "@/features/submissions/types";
import type { Language } from "@/types/i18n";

type SubmissionFeedbackPanelProps = {
  language?: Language;
  submission: SubmissionRow;
};

export function SubmissionFeedbackPanel({
  language = "en",
  submission,
}: SubmissionFeedbackPanelProps) {
  const copy = getDashboardCopy(language);

  if (submission.status === "reviewed") {
    return (
      <StatusNotice
        tone="success"
        size="comfortable"
        align="left"
        title={copy.submissions.feedbackTitle}
      >
        <div className="mb-4">
          <Badge tone="success" size="sm">
            {copy.submissions.scoreLabel}: {submission.rating ?? "—"} / 5
          </Badge>
        </div>
        <p className="font-medium leading-relaxed">
          &ldquo;{submission.feedback_text}&rdquo;
        </p>
      </StatusNotice>
    );
  }

  return (
    <StatusNotice tone="default" size="comfortable" dashed className="mt-2">
      <p className="italic">{copy.submissions.waitingForReview}</p>
    </StatusNotice>
  );
}
