import { redactEmailAddress } from "@/lib/privacy";
import type { Language } from "@/types/i18n";
import type { Json, Tables } from "@/types/supabase";

export type NotificationEventRow = Tables<"notification_events">;
export type NotificationDeliveryRow = Tables<"notification_deliveries">;
export type NotificationEmailJobRow = Tables<"notification_email_jobs">;
export type NotificationEmailJobAuditEventRow =
  Tables<"notification_email_job_audit_events">;

export type AdminNotificationEvent = NotificationEventRow & {
  deliveries: NotificationDeliveryRow[];
  emailJob: NotificationEmailJobRow | null;
  latestDelivery: NotificationDeliveryRow | null;
  retryAuditEvents: NotificationEmailJobAuditEventRow[];
};

const NOTIFICATION_STATUS_PRIORITY = {
  bounced: 0,
  complained: 0,
  dead_letter: 0,
  failed: 0,
  suppressed: 0,
  delayed: 1,
  processing: 2,
  queued: 2,
  accepted: 3,
  sent: 3,
  delivered: 4,
} as const satisfies Record<NotificationEventRow["status"], number>;

export const notificationFailureStatuses = [
  "bounced",
  "complained",
  "dead_letter",
  "failed",
  "suppressed",
] as const satisfies readonly NotificationEventRow["status"][];

export const notificationHistoryStatuses = [
  "accepted",
  "delivered",
  "sent",
] as const satisfies readonly NotificationEventRow["status"][];

export const notificationInFlightStatuses = [
  "delayed",
  "processing",
  "queued",
] as const satisfies readonly NotificationEventRow["status"][];

const notificationRetryableJobStatuses = [
  "dead_letter",
  "failed",
] as const satisfies readonly NotificationEmailJobRow["status"][];

const NOTIFICATION_FAILURE_STATUS_SET = new Set<NotificationEventRow["status"]>(
  notificationFailureStatuses,
);
const NOTIFICATION_HISTORY_STATUS_SET = new Set<NotificationEventRow["status"]>(
  notificationHistoryStatuses,
);
const NOTIFICATION_IN_FLIGHT_STATUS_SET = new Set<
  NotificationEventRow["status"]
>(notificationInFlightStatuses);
const NOTIFICATION_RETRYABLE_JOB_STATUS_SET = new Set<
  NotificationEmailJobRow["status"]
>(notificationRetryableJobStatuses);

/**
 * Narrows JSON payload fragments to plain objects before field extraction.
 */
function asObject(value: Json) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, Json | undefined>;
}

/**
 * Reads a non-empty string field from a JSON notification payload.
 */
function getStringValue(payload: Json, key: string) {
  const record = asObject(payload);
  const value = record?.[key];

  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

/**
 * Reads a numeric field from a JSON notification payload.
 */
function getNumberValue(payload: Json, key: string) {
  const record = asObject(payload);
  const value = record?.[key];

  return typeof value === "number" ? value : null;
}

/**
 * Sorts admin notification events by delivery status priority and then by most
 * recent creation time.
 */
export function compareAdminNotificationPriority(
  left: AdminNotificationEvent,
  right: AdminNotificationEvent,
) {
  const byStatus =
    NOTIFICATION_STATUS_PRIORITY[left.status] -
    NOTIFICATION_STATUS_PRIORITY[right.status];
  if (byStatus !== 0) {
    return byStatus;
  }

  return (
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

/**
 * Identifies terminal notification states that require operator attention.
 */
export function isNotificationFailureStatus(
  status: NotificationEventRow["status"],
) {
  return NOTIFICATION_FAILURE_STATUS_SET.has(status);
}

/**
 * Identifies accepted or completed states shown in notification history.
 */
export function isNotificationHistoryStatus(
  status: NotificationEventRow["status"],
) {
  return NOTIFICATION_HISTORY_STATUS_SET.has(status);
}

/**
 * Identifies queued, processing, or delayed notification states.
 */
export function isNotificationInFlightStatus(
  status: NotificationEventRow["status"],
) {
  return NOTIFICATION_IN_FLIGHT_STATUS_SET.has(status);
}

/**
 * Identifies durable email jobs that an admin can safely send back to queued
 * through the audited manual retry action.
 */
export function isNotificationRetryableJobStatus(
  status: NotificationEmailJobRow["status"],
) {
  return NOTIFICATION_RETRYABLE_JOB_STATUS_SET.has(status);
}

/**
 * Formats a stored notification event type into a short admin-facing label.
 */
export function formatNotificationEventType(eventType: string) {
  switch (eventType) {
    case "contact_message_received":
      return "Contact message";
    case "content_release_sent":
      return "Release email";
    case "content_release_broadcast_sent":
      return "Release broadcast";
    case "content_release_test_sent":
      return "Release preview";
    case "dictionary_entry_report_submitted":
      return "Dictionary report";
    case "exercise_submission_received":
      return "Exercise submission";
    case "profile_signup":
      return "User signup";
    case "submission_reviewed":
      return "Feedback ready";
    default:
      return eventType.replace(/_/g, " ");
  }
}

/**
 * Formats a stored notification event type into a short localized admin label.
 */
export function formatLocalizedNotificationEventType(
  eventType: string,
  language: Language = "en",
) {
  if (language === "en") {
    return formatNotificationEventType(eventType);
  }

  switch (eventType) {
    case "contact_message_received":
      return "Contactbericht";
    case "content_release_sent":
      return "Release-e-mail";
    case "content_release_broadcast_sent":
      return "Releasebroadcast";
    case "content_release_test_sent":
      return "Releasepreview";
    case "dictionary_entry_report_submitted":
      return "Woordenboekrapport";
    case "exercise_submission_received":
      return "Oefeninzending";
    case "profile_signup":
      return "Gebruikersaanmelding";
    case "submission_reviewed":
      return "Feedback klaar";
    default:
      return eventType.replace(/_/g, " ");
  }
}

/**
 * Formats a stored notification event status into a short localized label.
 */
export function formatLocalizedNotificationEventStatus(
  status: NotificationEventRow["status"],
  language: Language = "en",
) {
  const englishLabels = {
    accepted: "Accepted",
    bounced: "Bounced",
    complained: "Complaint",
    dead_letter: "Dead letter",
    delayed: "Delayed",
    delivered: "Delivered",
    failed: "Failed",
    processing: "Processing",
    queued: "Queued",
    sent: "Sent",
    suppressed: "Suppressed",
  } satisfies Record<NotificationEventRow["status"], string>;

  if (language === "en") {
    return englishLabels[status];
  }

  return (
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
  )[status];
}

/**
 * Formats a stored aggregate type into a short admin-facing label.
 */
export function formatNotificationAggregateType(aggregateType: string) {
  switch (aggregateType) {
    case "contact_message":
      return "Contact";
    case "content_release":
      return "Content release";
    case "entry_report":
      return "Entry report";
    case "profile":
      return "Profile";
    case "submission":
      return "Submission";
    default:
      return aggregateType.replace(/_/g, " ");
  }
}

/**
 * Formats a stored aggregate type into a short localized admin label.
 */
export function formatLocalizedNotificationAggregateType(
  aggregateType: string,
  language: Language = "en",
) {
  if (language === "en") {
    return formatNotificationAggregateType(aggregateType);
  }

  switch (aggregateType) {
    case "contact_message":
      return "Contact";
    case "content_release":
      return "Contentrelease";
    case "entry_report":
      return "Itemrapport";
    case "profile":
      return "Profiel";
    case "submission":
      return "Inzending";
    default:
      return aggregateType.replace(/_/g, " ");
  }
}

/**
 * Formats a notification timestamp for the admin UI.
 */
export function formatNotificationTimestamp(
  timestamp: string,
  language: Language = "en",
) {
  return new Date(timestamp).toLocaleString(
    language === "nl" ? "nl-BE" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );
}

/**
 * Extracts context badges from an admin notification event payload so the list
 * view can show the most relevant identifying metadata inline.
 */
export function getNotificationContextBadges(
  event: AdminNotificationEvent,
  language: Language = "en",
) {
  const badges: string[] = [];
  const copy =
    language === "nl"
      ? {
          audience: "Publiek",
          email: "E-mail",
          entry: "Item",
          exercise: "Oefening",
          inquiry: "Vraagtype",
          items: "Items",
          language: "Taal",
          lesson: "Les",
          locale: "Taal",
          name: "Naam",
          preview: "Preview",
          rating: "Score",
          reason: "Reden",
          recipients: "Ontvangers",
          segment: "Segment",
          sender: "Afzender",
          type: "Type",
        }
      : {
          audience: "Audience",
          email: "Email",
          entry: "Entry",
          exercise: "Exercise",
          inquiry: "Inquiry",
          items: "Items",
          language: "Language",
          lesson: "Lesson",
          locale: "Locale",
          name: "Name",
          preview: "Preview",
          rating: "Rating",
          reason: "Reason",
          recipients: "Recipients",
          segment: "Segment",
          sender: "Sender",
          type: "Type",
        };

  switch (event.event_type) {
    case "contact_message_received": {
      const inquiryType = getStringValue(event.payload, "inquiry_type");
      const senderEmail = getStringValue(event.payload, "sender_email");
      const locale = getStringValue(event.payload, "locale");

      if (inquiryType) {
        badges.push(`${copy.inquiry}: ${inquiryType.replace(/_/g, " ")}`);
      }
      if (senderEmail) {
        badges.push(
          `${copy.sender}: ${redactEmailAddress(senderEmail) ?? senderEmail}`,
        );
      }
      if (locale) {
        badges.push(`${copy.locale}: ${locale.toUpperCase()}`);
      }
      break;
    }
    case "content_release_sent":
    case "content_release_broadcast_sent":
    case "content_release_test_sent": {
      const audienceSegment = getStringValue(event.payload, "audience_segment");
      const itemCount = getNumberValue(event.payload, "item_count");
      const locale = getStringValue(event.payload, "locale");
      const preview = getStringValue(event.payload, "preview");
      const releaseType = getStringValue(event.payload, "release_type");
      const recipientCount = getNumberValue(event.payload, "recipient_count");
      const segmentId = getStringValue(event.payload, "segment_id");

      if (audienceSegment) {
        badges.push(`${copy.audience}: ${audienceSegment.replace(/_/g, " ")}`);
      }
      if (releaseType) {
        badges.push(`${copy.type}: ${releaseType.replace(/_/g, " ")}`);
      }
      if (itemCount !== null) {
        badges.push(`${copy.items}: ${itemCount}`);
      }
      if (recipientCount !== null) {
        badges.push(`${copy.recipients}: ${recipientCount}`);
      }
      if (locale) {
        badges.push(`${copy.locale}: ${locale.toUpperCase()}`);
      }
      if (segmentId) {
        badges.push(`${copy.segment}: ${segmentId}`);
      }
      if (preview === "true") {
        badges.push(copy.preview);
      }
      break;
    }
    case "dictionary_entry_report_submitted": {
      const entryId = getStringValue(event.payload, "entry_id");
      const locale = getStringValue(event.payload, "locale");
      const reason = getStringValue(event.payload, "reason");

      if (entryId) {
        badges.push(`${copy.entry}: ${entryId}`);
      }
      if (reason) {
        badges.push(`${copy.reason}: ${reason.replace(/_/g, " ")}`);
      }
      if (locale) {
        badges.push(`${copy.locale}: ${locale.toUpperCase()}`);
      }
      break;
    }
    case "exercise_submission_received": {
      const lessonSlug = getStringValue(event.payload, "lesson_slug");
      const exerciseId = getStringValue(event.payload, "exercise_id");
      const submittedLanguage = getStringValue(
        event.payload,
        "submitted_language",
      );

      if (lessonSlug) {
        badges.push(`${copy.lesson}: ${lessonSlug}`);
      }
      if (exerciseId) {
        badges.push(`${copy.exercise}: ${exerciseId}`);
      }
      if (submittedLanguage) {
        badges.push(`${copy.language}: ${submittedLanguage.toUpperCase()}`);
      }
      break;
    }
    case "submission_reviewed": {
      const lessonSlug = getStringValue(event.payload, "lesson_slug");
      const exerciseId = getStringValue(event.payload, "exercise_id");
      const rating = getNumberValue(event.payload, "rating");

      if (lessonSlug) {
        badges.push(`${copy.lesson}: ${lessonSlug}`);
      }
      if (exerciseId) {
        badges.push(`${copy.exercise}: ${exerciseId}`);
      }
      if (rating !== null) {
        badges.push(`${copy.rating}: ${rating}/5`);
      }
      break;
    }
    case "profile_signup": {
      const profileEmail = getStringValue(event.payload, "profile_email");
      const profileFullName = getStringValue(
        event.payload,
        "profile_full_name",
      );

      if (profileEmail) {
        badges.push(
          `${copy.email}: ${redactEmailAddress(profileEmail) ?? profileEmail}`,
        );
      }
      if (profileFullName) {
        badges.push(`${copy.name}: ${profileFullName}`);
      }
      break;
    }
    default:
      break;
  }

  return badges;
}
