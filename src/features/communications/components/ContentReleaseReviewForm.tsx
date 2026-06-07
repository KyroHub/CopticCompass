"use client";

import { updateContentReleaseStatus } from "@/actions/admin";
import { buttonClassName } from "@/components/Button";
import { ElevatedPanel } from "@/components/ElevatedPanel";
import { FormField } from "@/components/FormField";
import { useLanguage } from "@/components/LanguageProvider";
import {
  CONTENT_RELEASE_EDITABLE_STATUSES,
  formatContentReleaseStatus,
  type ContentReleaseRow,
} from "@/features/communications/lib/releases";

const contentReleaseReviewFormCopy = {
  en: {
    label: "Draft status",
    save: "Save draft state",
  },
  nl: {
    label: "Conceptstatus",
    save: "Conceptstatus opslaan",
  },
} as const;

export function ContentReleaseReviewForm({
  releaseId,
  status,
}: {
  releaseId: string;
  status: ContentReleaseRow["status"];
}) {
  const { language } = useLanguage();
  const copy = contentReleaseReviewFormCopy[language];

  if (status !== "draft" && status !== "approved" && status !== "cancelled") {
    return null;
  }

  const editableStatus =
    status === "draft" || status === "approved" || status === "cancelled"
      ? status
      : "draft";

  return (
    <form action={updateContentReleaseStatus} className="space-y-4 p-5">
      <input type="hidden" name="release_id" value={releaseId} />
      <ElevatedPanel className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <FormField
          htmlFor={`content-release-status-${releaseId}`}
          label={copy.label}
          labelTone="muted"
          className="min-w-[14rem] flex-1"
        >
          <select
            id={`content-release-status-${releaseId}`}
            name="status"
            defaultValue={editableStatus}
            className="select-base h-11 text-sm"
          >
            {CONTENT_RELEASE_EDITABLE_STATUSES.map((nextStatus) => (
              <option key={nextStatus} value={nextStatus}>
                {formatContentReleaseStatus(nextStatus, language)}
              </option>
            ))}
          </select>
        </FormField>

        <button
          type="submit"
          className={buttonClassName({ className: "px-5" })}
        >
          {copy.save}
        </button>
      </ElevatedPanel>
    </form>
  );
}
