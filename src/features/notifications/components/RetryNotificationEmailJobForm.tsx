"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect } from "react";

import { retryNotificationEmailJob } from "@/actions/admin";
import type { RetryNotificationEmailJobState } from "@/actions/admin/states";
import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { StatusNotice } from "@/components/StatusNotice";
import { AdminErrorDisclosure } from "@/features/admin/components/AdminErrorDisclosure";

const retryNotificationEmailJobFormCopy = {
  en: {
    description:
      "Use this only after you have checked the failure and the recipient is safe to contact. The reason is stored in the audit trail.",
    label: "Retry notification",
    placeholder: "Why is this retry safe and necessary?",
    queueing: "Queueing retry...",
    reason: "Retry reason",
    title: "Manual recovery",
  },
  nl: {
    description:
      "Gebruik dit alleen nadat u de fout hebt gecontroleerd en de ontvanger veilig opnieuw kan worden benaderd. De reden wordt in het auditspoor opgeslagen.",
    label: "Melding opnieuw proberen",
    placeholder: "Waarom is deze retry veilig en nodig?",
    queueing: "Retry wordt ingepland...",
    reason: "Retryreden",
    title: "Handmatig herstel",
  },
} as const;

export function RetryNotificationEmailJobForm({ jobId }: { jobId: string }) {
  const { language } = useLanguage();
  const copy = retryNotificationEmailJobFormCopy[language];
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<
    RetryNotificationEmailJobState | null,
    FormData
  >(retryNotificationEmailJob, null);

  useEffect(() => {
    if (!state?.success) {
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }, [router, state?.success]);

  return (
    <form
      action={formAction}
      className="mt-6 space-y-4 rounded-lg border border-gold/30 bg-gold/10 p-5 dark:border-gold/25 dark:bg-gold/10"
    >
      <input type="hidden" name="job_id" value={jobId} />

      <div className="space-y-2">
        <p className="text-sm font-semibold text-ink">{copy.title}</p>
        <p className="text-sm leading-6 text-muted">{copy.description}</p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-ink">{copy.reason}</span>
        <textarea
          name="reason"
          required
          minLength={8}
          rows={3}
          className="w-full rounded-lg border border-line bg-surface px-4 py-3 text-sm leading-6 text-ink shadow-sm outline-none transition focus:border-coptic focus:ring-2 focus:ring-coptic/20"
          placeholder={copy.placeholder}
        />
      </label>

      <button
        type="submit"
        className={buttonClassName({ className: "px-6" })}
        disabled={isPending || state?.success === true}
      >
        {isPending ? copy.queueing : copy.label}
      </button>

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
