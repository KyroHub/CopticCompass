"use client";

import { Flag, Loader2, MessageSquareText } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import {
  submitEntryReport,
  type EntryReportActionState,
} from "@/actions/dictionaryEntryActions";
import { buttonClassName } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { useLanguage } from "@/components/LanguageProvider";
import { StatusNotice } from "@/components/StatusNotice";
import { SurfacePanel } from "@/components/SurfacePanel";
import type { LexicalEntry } from "@/features/dictionary/types";
import type { Language } from "@/types/i18n";

import {
  ENTRY_REPORT_REASON_LABEL_KEYS,
  type EntryActionNotice,
} from "../lib/entryActionBar";
import {
  ENTRY_REPORT_MAX_COMMENTARY_LENGTH,
  ENTRY_REPORT_MIN_COMMENTARY_LENGTH,
  ENTRY_REPORT_REASONS,
} from "../lib/entryActions";

type EntryReportPanelProps = {
  entry: LexicalEntry;
  language: Language;
  onClose: () => void;
  onSubmitted: (notice: NonNullable<EntryActionNotice>) => void;
};

export function EntryReportPanel({
  entry,
  language,
  onClose,
  onSubmitted,
}: EntryReportPanelProps) {
  const { t } = useLanguage();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState<
    EntryReportActionState,
    FormData
  >(submitEntryReport, null);

  useEffect(() => {
    if (!state?.success || !state.message) {
      return;
    }

    formRef.current?.reset();
    onSubmitted({
      message: state.message,
      tone: "success",
    });
    onClose();
  }, [onClose, onSubmitted, state?.message, state?.success]);

  return (
    <SurfacePanel shadow="soft" className="p-5">
      <div className="mb-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <MessageSquareText className="h-4 w-4 text-accent-strong dark:text-accent" />
          {t("entry.actions.reportTitle")}
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {t("entry.actions.reportDescription")}
        </p>
      </div>

      <form ref={formRef} action={formAction} className="space-y-4">
        <input type="hidden" name="entryId" value={entry.id} />
        <input type="hidden" name="language" value={language} />

        <div className="grid gap-4 md:grid-cols-[minmax(0,15rem)_1fr]">
          <FormField
            htmlFor={`entry-report-reason-${entry.id}`}
            label={t("entry.actions.reasonLabel")}
            labelTone="muted"
          >
            <select
              id={`entry-report-reason-${entry.id}`}
              name="reason"
              defaultValue=""
              required
              className="select-base h-11 text-sm"
            >
              <option value="" disabled>
                {t("entry.actions.reasonPlaceholder")}
              </option>
              {ENTRY_REPORT_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {t(ENTRY_REPORT_REASON_LABEL_KEYS[reason])}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            htmlFor={`entry-report-commentary-${entry.id}`}
            label={t("entry.actions.commentaryLabel")}
            labelTone="muted"
          >
            <textarea
              id={`entry-report-commentary-${entry.id}`}
              name="commentary"
              required
              minLength={ENTRY_REPORT_MIN_COMMENTARY_LENGTH}
              maxLength={ENTRY_REPORT_MAX_COMMENTARY_LENGTH}
              rows={5}
              className="textarea-base min-h-[8rem] resize-y text-sm leading-6"
              placeholder={t("entry.actions.commentaryPlaceholder")}
            />
          </FormField>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted">
            {t("entry.actions.commentaryHint")}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={buttonClassName({ size: "sm", variant: "ghost" })}
              onClick={onClose}
            >
              {t("entry.actions.cancelReport")}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={buttonClassName({ className: "gap-2 px-5" })}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Flag className="h-4 w-4" />
              )}
              {isPending
                ? t("entry.actions.submittingReport")
                : t("entry.actions.submitReport")}
            </button>
          </div>
        </div>

        {state?.error ? (
          <StatusNotice tone="error" align="left">
            {state.error}
          </StatusNotice>
        ) : null}
      </form>
    </SurfacePanel>
  );
}
