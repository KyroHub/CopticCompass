import * as React from "react";

import type { Language } from "@/types/i18n";

import { AudienceActionEmail } from "./AudienceActionEmail";

const copy = {
  en: {
    body: "Use this private, single-use link to review or change which Coptic Compass updates you receive. It expires in 30 minutes.",
    cta: "Manage email preferences",
    fallback: "If the button does not work, open this link in your browser:",
    greeting: "Hi",
    subject: "Manage your Coptic Compass email preferences",
    thanks:
      "If you did not request this link, you can safely ignore this email.",
    title: "Your email preferences",
  },
  nl: {
    body: "Gebruik deze persoonlijke link voor eenmalig gebruik om te bekijken of te wijzigen welke updates van Coptic Compass u ontvangt. De link verloopt over 30 minuten.",
    cta: "E-mailvoorkeuren beheren",
    fallback: "Werkt de knop niet, open dan deze link in uw browser:",
    greeting: "Dag",
    subject: "Beheer uw Coptic Compass e-mailvoorkeuren",
    thanks:
      "Hebt u deze link niet aangevraagd, dan kunt u deze e-mail gerust negeren.",
    title: "Uw e-mailvoorkeuren",
  },
} as const;

export function AudiencePreferenceLinkEmail({
  language,
  preferenceUrl,
  recipientName,
}: {
  language: Language;
  preferenceUrl: string;
  recipientName?: string | null;
}) {
  const localizedCopy = copy[language];
  return (
    <AudienceActionEmail
      actionUrl={preferenceUrl}
      body={localizedCopy.body}
      cta={localizedCopy.cta}
      fallback={localizedCopy.fallback}
      footerNote={localizedCopy.thanks}
      greeting={localizedCopy.greeting}
      recipientName={recipientName}
      title={localizedCopy.title}
    />
  );
}

export function getAudiencePreferenceLinkSubject(language: Language) {
  return copy[language].subject;
}
