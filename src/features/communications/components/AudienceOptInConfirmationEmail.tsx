import * as React from "react";

import type { Language } from "@/types/i18n";

import { AudienceActionEmail } from "./AudienceActionEmail";

type AudienceOptInConfirmationEmailProps = {
  confirmationUrl: string;
  language: Language;
  recipientName?: string | null;
  requestedTopics: {
    books: boolean;
    generalUpdates: boolean;
    lessons: boolean;
  };
};

const copy = {
  en: {
    body: "Please confirm that you want to receive these Coptic Compass updates:",
    cta: "Confirm email updates",
    fallback: "If the button does not work, open this link in your browser:",
    greeting: "Hi",
    subject: "Confirm your Coptic Compass email updates",
    thanks: "If you did not request this, you can safely ignore this email.",
    title: "Confirm your Coptic Compass updates",
    topics: {
      books: "Book and publication releases",
      generalUpdates: "Major project updates",
      lessons: "New grammar lessons",
    },
  },
  nl: {
    body: "Bevestig dat u deze updates van Coptic Compass wilt ontvangen:",
    cta: "E-mailupdates bevestigen",
    fallback: "Werkt de knop niet, open dan deze link in uw browser:",
    greeting: "Dag",
    subject: "Bevestig uw Coptic Compass e-mailupdates",
    thanks:
      "Hebt u dit niet aangevraagd, dan kunt u deze e-mail gerust negeren.",
    title: "Bevestig uw updates van Coptic Compass",
    topics: {
      books: "Boek- en publicatie-uitgaven",
      generalUpdates: "Belangrijke projectupdates",
      lessons: "Nieuwe grammaticalessen",
    },
  },
} as const;

export function AudienceOptInConfirmationEmail({
  confirmationUrl,
  language,
  recipientName,
  requestedTopics,
}: AudienceOptInConfirmationEmailProps) {
  const localizedCopy = copy[language];
  const topicSummary = Object.entries(requestedTopics)
    .filter(([, requested]) => requested)
    .map(
      ([topic]) => localizedCopy.topics[topic as keyof typeof requestedTopics],
    )
    .join(" · ");

  return (
    <AudienceActionEmail
      actionUrl={confirmationUrl}
      body={localizedCopy.body}
      cta={localizedCopy.cta}
      fallback={localizedCopy.fallback}
      footerNote={localizedCopy.thanks}
      greeting={localizedCopy.greeting}
      recipientName={recipientName}
      title={localizedCopy.title}
      topicSummary={topicSummary}
    />
  );
}

export function getAudienceOptInConfirmationSubject(language: Language) {
  return copy[language].subject;
}
