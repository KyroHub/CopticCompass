"use client";

import { useActionState } from "react";

import { sendContentRelease } from "@/actions/admin";
import type { SendContentReleaseState } from "@/actions/admin/states";
import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { StatusNotice } from "@/components/StatusNotice";
import type { ContentReleaseRow } from "@/features/communications/lib/releases";

const sendContentReleaseFormCopy = {
  en: {
    alreadySent: "This release is already marked as sent.",
    approveFirst: "Approve the draft before queueing it for subscribers.",
    beingDelivered:
      "This release is currently being delivered in the background.",
    queued:
      "This release is queued for background delivery. You can resume the worker if it stalls.",
    queue: "Queue release send",
    queueing: "Queueing release...",
    resume: "Resume queued delivery",
    resuming: "Resuming release...",
  },
  nl: {
    alreadySent: "Deze release is al gemarkeerd als verzonden.",
    approveFirst:
      "Keur het concept goed voordat u het voor abonnees in de wachtrij zet.",
    beingDelivered: "Deze release wordt momenteel op de achtergrond bezorgd.",
    queued:
      "Deze release staat in de wachtrij voor achtergrondbezorging. U kunt de worker hervatten als die vastloopt.",
    queue: "Releaseverzending in wachtrij zetten",
    queueing: "Release wordt in de wachtrij gezet...",
    resume: "Wachtrijbezorging hervatten",
    resuming: "Release wordt hervat...",
  },
} as const;

export function SendContentReleaseForm({
  releaseId,
  status,
}: {
  releaseId: string;
  status: ContentReleaseRow["status"];
}) {
  const { language } = useLanguage();
  const copy = sendContentReleaseFormCopy[language];
  const [state, formAction, isPending] = useActionState<
    SendContentReleaseState | null,
    FormData
  >(sendContentRelease, null);

  if (status === "sent") {
    return (
      <StatusNotice tone="success" align="left">
        {copy.alreadySent}
      </StatusNotice>
    );
  }

  if (status === "queued") {
    return (
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="release_id" value={releaseId} />

        <StatusNotice tone="info" align="left">
          {copy.queued}
        </StatusNotice>

        <button
          type="submit"
          className={buttonClassName({ className: "px-6" })}
          disabled={isPending}
        >
          {isPending ? copy.resuming : copy.resume}
        </button>

        {state?.message ? (
          <StatusNotice tone={state.success ? "success" : "error"} align="left">
            {state.message}
          </StatusNotice>
        ) : null}
      </form>
    );
  }

  if (status === "sending") {
    return (
      <StatusNotice tone="info" align="left">
        {copy.beingDelivered}
      </StatusNotice>
    );
  }

  if (status !== "approved") {
    return (
      <StatusNotice tone="info" align="left">
        {copy.approveFirst}
      </StatusNotice>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="release_id" value={releaseId} />

      <button
        type="submit"
        className={buttonClassName({ className: "px-6" })}
        disabled={isPending}
      >
        {isPending ? copy.queueing : copy.queue}
      </button>

      {state?.message ? (
        <StatusNotice tone={state.success ? "success" : "error"} align="left">
          {state.message}
        </StatusNotice>
      ) : null}
    </form>
  );
}
