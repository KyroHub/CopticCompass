"use client";

import { useActionState } from "react";

import { syncAudienceContactsWithResend } from "@/actions/admin";
import type { SyncAudienceContactsState } from "@/actions/admin/states";
import { Button } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { StatusNotice } from "@/components/StatusNotice";
import { AdminErrorDisclosure } from "@/features/admin/components/AdminErrorDisclosure";

const syncAudienceContactsFormCopy = {
  en: {
    sync: "Sync audience to Resend",
    syncing: "Syncing audience...",
  },
  nl: {
    sync: "Publiek synchroniseren met Resend",
    syncing: "Publiek wordt gesynchroniseerd...",
  },
} as const;

export function SyncAudienceContactsForm() {
  const { language } = useLanguage();
  const copy = syncAudienceContactsFormCopy[language];
  const [state, formAction, isPending] = useActionState<
    SyncAudienceContactsState | null,
    FormData
  >(syncAudienceContactsWithResend, null);

  return (
    <form action={formAction} className="space-y-4">
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? copy.syncing : copy.sync}
      </Button>

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
