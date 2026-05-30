"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect } from "react";

import { deleteContentReleaseDraft } from "@/actions/admin";
import type { DeleteContentReleaseState } from "@/actions/admin/states";
import { Button } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { StatusNotice } from "@/components/StatusNotice";
import {
  isContentReleaseDeletableStatus,
  type ContentReleaseRow,
} from "@/features/communications/lib/releases";

const deleteContentReleaseFormCopy = {
  en: {
    confirm:
      "Delete this release draft and its snapshotted items permanently? Sent or in-flight releases cannot be removed this way.",
    deleting: "Deleting draft...",
    description:
      "Use this for abandoned test drafts or cancelled announcements you do not want cluttering communications history.",
    label: "Delete draft",
    refreshing: "Refreshing...",
    title: "Remove unsent draft",
  },
  nl: {
    confirm:
      "Dit releaseconcept en de snapshotitems definitief verwijderen? Verzonden of lopende releases kunnen niet op deze manier worden verwijderd.",
    deleting: "Concept wordt verwijderd...",
    description:
      "Gebruik dit voor verlaten testconcepten of geannuleerde aankondigingen die u niet in de communicatiegeschiedenis wilt laten staan.",
    label: "Concept verwijderen",
    refreshing: "Vernieuwen...",
    title: "Onverzonden concept verwijderen",
  },
} as const;

export function DeleteContentReleaseForm({
  releaseId,
  status,
}: {
  releaseId: string;
  status: ContentReleaseRow["status"];
}) {
  const { language } = useLanguage();
  const copy = deleteContentReleaseFormCopy[language];
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<
    DeleteContentReleaseState | null,
    FormData
  >(deleteContentReleaseDraft, null);
  let buttonLabel: string = copy.label;

  if (isPending) {
    buttonLabel = copy.deleting;
  } else if (state?.success) {
    buttonLabel = copy.refreshing;
  }

  useEffect(() => {
    if (!state?.success) {
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }, [router, state?.success]);

  if (!isContentReleaseDeletableStatus(status)) {
    return null;
  }

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-danger/25 bg-danger/5 p-5 dark:bg-danger/10"
      onSubmit={(event) => {
        if (!window.confirm(copy.confirm)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="release_id" value={releaseId} />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-danger">{copy.title}</p>
          <p className="text-sm leading-6 text-danger">{copy.description}</p>
        </div>

        <Button
          type="submit"
          variant="secondary"
          className="border-danger/25 bg-surface/90 text-danger hover:border-danger/35 hover:bg-danger/5 dark:bg-danger/10 dark:hover:bg-danger/15"
          disabled={isPending || state?.success === true}
        >
          {buttonLabel}
        </Button>
      </div>

      {state?.message && !state.success ? (
        <StatusNotice tone="error" align="left">
          {state.message}
        </StatusNotice>
      ) : null}
    </form>
  );
}
