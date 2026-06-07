"use client";

import { updateEntryReportStatus } from "@/actions/admin";
import { buttonClassName } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { useLanguage } from "@/components/LanguageProvider";
import { surfacePanelClassName } from "@/components/SurfacePanel";

import {
  ENTRY_REPORT_STATUSES,
  formatEntryReportStatus,
  type EntryReportStatus,
} from "../lib/entryActions";

type EntryReportReviewFormProps = {
  reportId: string;
  status: EntryReportStatus;
};

const entryReportReviewFormCopy = {
  en: {
    label: "Review status",
    save: "Save status",
  },
  nl: {
    label: "Beoordelingsstatus",
    save: "Status opslaan",
  },
} as const;

export function EntryReportReviewForm({
  reportId,
  status,
}: EntryReportReviewFormProps) {
  const { language } = useLanguage();
  const copy = entryReportReviewFormCopy[language];

  return (
    <form
      action={updateEntryReportStatus}
      className={surfacePanelClassName({ className: "space-y-4 p-5" })}
    >
      <input type="hidden" name="report_id" value={reportId} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <FormField
          htmlFor={`entry-report-status-${reportId}`}
          label={copy.label}
          labelTone="muted"
          className="min-w-[14rem] flex-1"
        >
          <select
            id={`entry-report-status-${reportId}`}
            name="status"
            defaultValue={status}
            className="select-base h-11 text-sm"
          >
            {ENTRY_REPORT_STATUSES.map((nextStatus) => (
              <option key={nextStatus} value={nextStatus}>
                {formatEntryReportStatus(nextStatus, language)}
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
      </div>
    </form>
  );
}
