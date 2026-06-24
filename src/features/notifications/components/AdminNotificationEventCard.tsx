"use client";

import { Badge } from "@/components/Badge";
import { useLanguage } from "@/components/LanguageProvider";
import { SurfacePanel } from "@/components/SurfacePanel";
import { AdminErrorDisclosure } from "@/features/admin/components/AdminErrorDisclosure";
import {
  formatLocalizedNotificationAggregateType,
  formatLocalizedNotificationEventType,
  formatNotificationTimestamp,
  getNotificationContextBadges,
  isNotificationFailureStatus,
  type AdminNotificationEvent,
} from "@/features/notifications/lib/notifications";

import { NotificationEventStatusBadge } from "./NotificationEventStatusBadge";

type AdminNotificationEventCardProps = {
  event: AdminNotificationEvent;
};

const adminNotificationEventCardCopy = {
  en: {
    aggregate: "Aggregate",
    createdOn: "Created on",
    lastError: "Last error",
    latestDeliveryStatus: "Latest delivery status",
    notificationFailed: "This notification did not deliver.",
    processedOn: "Processed on",
    providerMessageId: "Provider message ID",
    recipient: "Recipient",
  },
  nl: {
    aggregate: "Aggregaat",
    createdOn: "Aangemaakt op",
    lastError: "Laatste fout",
    latestDeliveryStatus: "Laatste leveringsstatus",
    notificationFailed: "Deze melding werd niet bezorgd.",
    processedOn: "Verwerkt op",
    providerMessageId: "Providerbericht-ID",
    recipient: "Ontvanger",
  },
} as const;

export function AdminNotificationEventCard({
  event,
}: AdminNotificationEventCardProps) {
  const { language } = useLanguage();
  const copy = adminNotificationEventCardCopy[language];
  const contextBadges = getNotificationContextBadges(event, language);

  return (
    <SurfacePanel
      as="article"
      rounded="lg"
      variant="elevated"
      className="p-6 md:p-8"
    >
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <NotificationEventStatusBadge status={event.status} />
            <Badge tone="surface" size="xs">
              {formatLocalizedNotificationEventType(event.event_type, language)}
            </Badge>
            <Badge tone="neutral" size="xs">
              {formatLocalizedNotificationAggregateType(
                event.aggregate_type,
                language,
              )}
            </Badge>
          </div>

          <h2 className="text-2xl font-semibold text-ink">{event.subject}</h2>

          <div className="mt-3 space-y-2 text-sm text-muted">
            <p>
              {copy.recipient}:{" "}
              <span className="font-semibold text-ink">{event.recipient}</span>
            </p>
            <p>
              {copy.createdOn}{" "}
              {formatNotificationTimestamp(event.created_at, language)}
            </p>
            {event.processed_at ? (
              <p>
                {copy.processedOn}{" "}
                {formatNotificationTimestamp(event.processed_at, language)}
              </p>
            ) : null}
            <p>
              {copy.aggregate}:{" "}
              {formatLocalizedNotificationAggregateType(
                event.aggregate_type,
                language,
              )}{" "}
              #{event.aggregate_id}
            </p>
            {event.latestDelivery?.provider_message_id ? (
              <p>
                {copy.providerMessageId}:{" "}
                {event.latestDelivery.provider_message_id}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {contextBadges.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {contextBadges.map((badge) => (
            <Badge key={badge} tone="flat" size="xs">
              {badge}
            </Badge>
          ))}
        </div>
      ) : null}

      {isNotificationFailureStatus(event.status) && event.last_error ? (
        <AdminErrorDisclosure
          language={language}
          message={copy.notificationFailed}
          technicalDetails={event.last_error}
          title={copy.lastError}
        />
      ) : (
        <div className="rounded-lg border border-line bg-elevated px-5 py-4 text-sm leading-7 text-muted">
          {copy.latestDeliveryStatus}:{" "}
          <span className="font-semibold text-ink">
            {event.latestDelivery?.status ?? event.status}
          </span>
        </div>
      )}
    </SurfacePanel>
  );
}
