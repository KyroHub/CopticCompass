"use client";

import { Badge } from "@/components/Badge";
import { useLanguage } from "@/components/LanguageProvider";
import { SurfacePanel } from "@/components/SurfacePanel";
import {
  getAudienceLocaleLabel,
  getAudienceSourceLabel,
  hasAudienceSubscriptions,
  type AdminAudienceContactRow,
} from "@/features/communications/lib/communications";
import type { Language } from "@/types/i18n";

const adminAudienceContactCardCopy = {
  en: {
    books: "Books",
    consented: "Consented",
    generalUpdates: "General updates",
    lastChanged: "Last changed",
    lessons: "Lessons",
    noActiveTopics: "No active topics",
    notRecorded: "Not recorded yet",
    paused: "Paused",
    ready: "Ready",
    resendError: "Resend error",
    resendPending: "Resend pending",
    resendStatus: "Resend status",
    resendSynced: "Resend synced",
    subscribed: "Subscribed",
  },
  nl: {
    books: "Boeken",
    consented: "Toestemming",
    generalUpdates: "Algemene updates",
    lastChanged: "Laatst gewijzigd",
    lessons: "Lessen",
    noActiveTopics: "Geen actieve onderwerpen",
    notRecorded: "Nog niet vastgelegd",
    paused: "Gepauzeerd",
    ready: "Klaar",
    resendError: "Resend-fout",
    resendPending: "Resend in wachtrij",
    resendStatus: "Resend-status",
    resendSynced: "Resend gesynchroniseerd",
    subscribed: "Geabonneerd",
  },
} as const;

function formatAdminAudienceDate(
  value: string | null,
  language: Language,
  emptyLabel: string,
) {
  if (!value) {
    return emptyLabel;
  }

  return new Date(value).toLocaleString(language === "nl" ? "nl-BE" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AdminAudienceContactCard({
  contact,
}: {
  contact: AdminAudienceContactRow;
}) {
  const { language } = useLanguage();
  const copy = adminAudienceContactCardCopy[language];
  const isSubscribed = hasAudienceSubscriptions(contact);
  const syncState = contact.syncState;
  let syncTone: "coptic" | "neutral" | "surface" = "surface";
  let syncLabel: string = copy.resendPending;

  if (syncState?.last_error) {
    syncTone = "neutral";
    syncLabel = copy.resendError;
  } else if (syncState?.last_synced_at) {
    syncTone = "coptic";
    syncLabel = copy.resendSynced;
  }

  return (
    <SurfacePanel rounded="lg" className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-ink">
            {contact.full_name || contact.email}
          </h3>
          <p className="mt-1 text-sm text-muted">{contact.email}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge tone={isSubscribed ? "accent" : "neutral"} size="xs">
            {isSubscribed ? copy.subscribed : copy.paused}
          </Badge>
          <Badge tone={syncTone} size="xs">
            {syncLabel}
          </Badge>
          <Badge tone="surface" size="xs">
            {getAudienceSourceLabel(contact.source, language)}
          </Badge>
          <Badge tone="coptic" size="xs">
            {getAudienceLocaleLabel(contact.locale, language)}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {contact.lessons_opt_in ? (
          <Badge tone="accent" size="xs">
            {copy.lessons}
          </Badge>
        ) : null}
        {contact.books_opt_in ? (
          <Badge tone="accent" size="xs">
            {copy.books}
          </Badge>
        ) : null}
        {contact.general_updates_opt_in ? (
          <Badge tone="accent" size="xs">
            {copy.generalUpdates}
          </Badge>
        ) : null}
        {!contact.lessons_opt_in &&
        !contact.books_opt_in &&
        !contact.general_updates_opt_in ? (
          <Badge tone="neutral" size="xs">
            {copy.noActiveTopics}
          </Badge>
        ) : null}
      </div>

      <dl className="grid gap-3 text-sm text-muted md:grid-cols-2">
        <div>
          <dt className="font-semibold text-ink">{copy.consented}</dt>
          <dd>
            {formatAdminAudienceDate(
              contact.consented_at,
              language,
              copy.notRecorded,
            )}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">{copy.lastChanged}</dt>
          <dd>
            {formatAdminAudienceDate(
              contact.updated_at,
              language,
              copy.notRecorded,
            )}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">{copy.resendSynced}</dt>
          <dd>
            {formatAdminAudienceDate(
              syncState?.last_synced_at ?? null,
              language,
              copy.notRecorded,
            )}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">{copy.resendStatus}</dt>
          <dd>{syncState?.last_error ?? copy.ready}</dd>
        </div>
      </dl>
    </SurfacePanel>
  );
}
