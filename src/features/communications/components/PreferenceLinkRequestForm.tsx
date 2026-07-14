"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  requestAudiencePreferenceLink,
  type PreferenceLinkRequestState,
} from "@/actions/communications";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { useLanguage } from "@/components/LanguageProvider";
import { StatusNotice } from "@/components/StatusNotice";
import { getPrivacyPath } from "@/lib/locale";

export function PreferenceLinkRequestForm() {
  const { language, t } = useLanguage();
  const [state, formAction, isPending] = useActionState<
    PreferenceLinkRequestState | null,
    FormData
  >(requestAudiencePreferenceLink, null);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="locale" value={language} />
      <FormField
        htmlFor="preference_email"
        label={t("contact.preferences.emailLabel")}
      >
        <input
          id="preference_email"
          type="email"
          name="email"
          required
          autoComplete="email"
          className="input-base"
          placeholder={t("contact.preferences.emailPlaceholder")}
        />
      </FormField>

      <p className="text-sm leading-6 text-muted">
        {t("contact.preferences.privacyPrefix")}{" "}
        <Link
          href={getPrivacyPath(language)}
          className="font-medium text-accent-strong hover:underline"
        >
          {t("contact.preferences.privacyLink")}
        </Link>
        .
      </p>

      <Button type="submit" disabled={isPending} fullWidth>
        {isPending
          ? t("contact.preferences.requesting")
          : t("contact.preferences.requestCta")}
      </Button>

      {state ? (
        <StatusNotice tone={state.success ? "success" : "error"} align="left">
          {state.message}
        </StatusNotice>
      ) : null}
    </form>
  );
}
