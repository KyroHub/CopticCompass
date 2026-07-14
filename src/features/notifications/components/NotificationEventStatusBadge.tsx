"use client";

import { Badge } from "@/components/Badge";
import { useLanguage } from "@/components/LanguageProvider";
import type { NotificationEventRow } from "@/features/notifications/lib/notifications";

type NotificationEventStatusBadgeProps = {
  status: NotificationEventRow["status"];
};

const STATUS_CONFIG: Record<
  NotificationEventRow["status"],
  {
    label: string;
    tone: "accent" | "coptic" | "neutral";
  }
> = {
  accepted: {
    label: "Accepted",
    tone: "coptic",
  },
  bounced: {
    label: "Bounced",
    tone: "accent",
  },
  complained: {
    label: "Complaint",
    tone: "accent",
  },
  dead_letter: {
    label: "Dead letter",
    tone: "accent",
  },
  delayed: {
    label: "Delayed",
    tone: "neutral",
  },
  delivered: {
    label: "Delivered",
    tone: "coptic",
  },
  failed: {
    label: "Failed",
    tone: "accent",
  },
  processing: {
    label: "Processing",
    tone: "neutral",
  },
  queued: {
    label: "Queued",
    tone: "neutral",
  },
  sent: {
    label: "Sent",
    tone: "coptic",
  },
  suppressed: {
    label: "Suppressed",
    tone: "accent",
  },
};

export function NotificationEventStatusBadge({
  status,
}: NotificationEventStatusBadgeProps) {
  const { language } = useLanguage();
  const config = STATUS_CONFIG[status];
  const label =
    language === "nl"
      ? (
          {
            accepted: "Geaccepteerd",
            bounced: "Teruggestuurd",
            complained: "Spamklacht",
            dead_letter: "Definitief mislukt",
            delayed: "Vertraagd",
            delivered: "Afgeleverd",
            failed: "Mislukt",
            processing: "Wordt verwerkt",
            queued: "In wachtrij",
            sent: "Verzonden",
            suppressed: "Geblokkeerd",
          } satisfies Record<NotificationEventRow["status"], string>
        )[status]
      : config.label;

  return (
    <Badge tone={config.tone} size="xs">
      {label}
    </Badge>
  );
}
