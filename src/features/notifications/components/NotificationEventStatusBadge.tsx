"use client";

import { Badge } from "@/components/Badge";
import { useLanguage } from "@/components/LanguageProvider";
import {
  formatLocalizedNotificationEventStatus,
  type NotificationEventRow,
} from "@/features/notifications/lib/notifications";

type NotificationEventStatusBadgeProps = {
  status: NotificationEventRow["status"];
};

const STATUS_CONFIG: Record<
  NotificationEventRow["status"],
  {
    tone: "accent" | "coptic" | "neutral";
  }
> = {
  accepted: {
    tone: "coptic",
  },
  bounced: {
    tone: "accent",
  },
  complained: {
    tone: "accent",
  },
  dead_letter: {
    tone: "accent",
  },
  delayed: {
    tone: "neutral",
  },
  delivered: {
    tone: "coptic",
  },
  failed: {
    tone: "accent",
  },
  processing: {
    tone: "neutral",
  },
  queued: {
    tone: "neutral",
  },
  sent: {
    tone: "coptic",
  },
  suppressed: {
    tone: "accent",
  },
};

export function NotificationEventStatusBadge({
  status,
}: NotificationEventStatusBadgeProps) {
  const { language } = useLanguage();
  const config = STATUS_CONFIG[status];

  return (
    <Badge tone={config.tone} size="xs">
      {formatLocalizedNotificationEventStatus(status, language)}
    </Badge>
  );
}
