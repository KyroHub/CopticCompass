"use client";

import { useActionState } from "react";

import { sendContentReleasePreview } from "@/actions/admin";
import type { SendContentReleaseState } from "@/actions/admin/states";
import { buttonClassName } from "@/components/Button";
import { elevatedPanelClassName } from "@/components/ElevatedPanel";
import { FormField } from "@/components/FormField";
import { useLanguage } from "@/components/LanguageProvider";
import { StatusNotice } from "@/components/StatusNotice";
import { AdminErrorDisclosure } from "@/features/admin/components/AdminErrorDisclosure";

const sendContentReleasePreviewFormCopy = {
  en: {
    description:
      "Sends a preview to the configured admin inbox without marking the release as sent.",
    englishPreview: "English preview",
    dutchPreview: "Dutch preview",
    label: "Preview locale",
    send: "Send preview email",
    sending: "Sending preview...",
  },
  nl: {
    description:
      "Verstuurt een preview naar de ingestelde admininbox zonder de release als verzonden te markeren.",
    englishPreview: "Engelse preview",
    dutchPreview: "Nederlandse preview",
    label: "Previewtaal",
    send: "Previewmail verzenden",
    sending: "Preview wordt verzonden...",
  },
} as const;

export function SendContentReleasePreviewForm({
  releaseId,
}: {
  releaseId: string;
}) {
  const { language } = useLanguage();
  const copy = sendContentReleasePreviewFormCopy[language];
  const [state, formAction, isPending] = useActionState<
    SendContentReleaseState | null,
    FormData
  >(sendContentReleasePreview, null);

  return (
    <form
      action={formAction}
      className={elevatedPanelClassName({ className: "space-y-4 p-5" })}
    >
      <input type="hidden" name="release_id" value={releaseId} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <FormField
          htmlFor={`content-release-preview-locale-${releaseId}`}
          label={copy.label}
          labelTone="muted"
          className="min-w-[14rem] flex-1"
        >
          <select
            id={`content-release-preview-locale-${releaseId}`}
            name="preview_locale"
            defaultValue="en"
            className="select-base h-11 text-sm"
          >
            <option value="en">{copy.englishPreview}</option>
            <option value="nl">{copy.dutchPreview}</option>
          </select>
        </FormField>

        <button
          type="submit"
          className={buttonClassName({
            className: "px-5",
            variant: "secondary",
          })}
          disabled={isPending}
        >
          {isPending ? copy.sending : copy.send}
        </button>
      </div>

      <p className="text-sm text-muted">{copy.description}</p>

      {state?.message && state.success ? (
        <StatusNotice tone="success" align="left">
          {state.message}
        </StatusNotice>
      ) : null}

      {state?.message && !state.success ? (
        <AdminErrorDisclosure language={language} message={state.message} />
      ) : null}
    </form>
  );
}
