import {
  compareAdminNotificationPriority,
  notificationFailureStatuses,
  notificationHistoryStatuses,
  notificationInFlightStatuses,
  type AdminNotificationEvent,
  type NotificationDeliveryRow,
  type NotificationEmailJobAuditEventRow,
  type NotificationEmailJobRow,
} from "@/features/notifications/lib/notifications";
import type { AppSupabaseClient, QueryResult } from "@/lib/supabase/queryTypes";

const ADMIN_NOTIFICATION_SENT_HISTORY_LIMIT = 18;
/**
 * Loads all attention-worthy notifications plus a capped accepted/delivered
 * history window, then attaches delivery attempts for the admin log UI.
 */
export async function getAdminNotificationEvents(
  supabase: AppSupabaseClient,
  limit = ADMIN_NOTIFICATION_SENT_HISTORY_LIMIT,
): Promise<QueryResult<AdminNotificationEvent[]>> {
  const [attentionEventsResult, historyEventsResult] = await Promise.all([
    supabase
      .from("notification_events")
      .select("*")
      .in("status", [
        ...notificationFailureStatuses,
        ...notificationInFlightStatuses,
      ])
      .order("created_at", { ascending: false }),
    supabase
      .from("notification_events")
      .select("*")
      .in("status", [...notificationHistoryStatuses])
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (
    attentionEventsResult.error ||
    !attentionEventsResult.data ||
    historyEventsResult.error ||
    !historyEventsResult.data
  ) {
    let error = { message: "Could not load notification activity." };
    if (attentionEventsResult.error) {
      error = { message: attentionEventsResult.error.message };
    } else if (historyEventsResult.error) {
      error = { message: historyEventsResult.error.message };
    }

    return {
      data: null,
      error,
    };
  }

  const notificationEvents = [
    ...attentionEventsResult.data,
    ...historyEventsResult.data,
  ];

  if (notificationEvents.length === 0) {
    return {
      data: [],
      error: null,
    };
  }

  const eventIds = notificationEvents.map((event) => event.id);
  const deliveriesResult = await supabase
    .from("notification_deliveries")
    .select("*")
    .in("event_id", eventIds)
    .order("created_at", { ascending: false });

  if (deliveriesResult.error) {
    return {
      data: null,
      error: { message: deliveriesResult.error.message },
    };
  }

  const jobsResult = await supabase
    .from("notification_email_jobs")
    .select("*")
    .in("notification_event_id", eventIds);

  if (jobsResult.error) {
    return {
      data: null,
      error: { message: jobsResult.error.message },
    };
  }

  const deliveriesByEventId = new Map<string, NotificationDeliveryRow[]>();
  const jobsByEventId = new Map<string, NotificationEmailJobRow>();

  for (const delivery of deliveriesResult.data ?? []) {
    const deliveries = deliveriesByEventId.get(delivery.event_id) ?? [];
    deliveries.push(delivery);
    deliveriesByEventId.set(delivery.event_id, deliveries);
  }

  for (const job of jobsResult.data ?? []) {
    jobsByEventId.set(job.notification_event_id, job);
  }

  const jobIds = (jobsResult.data ?? []).map((job) => job.id);
  const auditEventsByJobId = new Map<
    string,
    NotificationEmailJobAuditEventRow[]
  >();

  if (jobIds.length > 0) {
    const auditEventsResult = await supabase
      .from("notification_email_job_audit_events")
      .select("*")
      .in("notification_email_job_id", jobIds)
      .order("created_at", { ascending: false });

    if (auditEventsResult.error) {
      return {
        data: null,
        error: { message: auditEventsResult.error.message },
      };
    }

    for (const auditEvent of auditEventsResult.data ?? []) {
      const auditEvents =
        auditEventsByJobId.get(auditEvent.notification_email_job_id) ?? [];
      auditEvents.push(auditEvent);
      auditEventsByJobId.set(auditEvent.notification_email_job_id, auditEvents);
    }
  }

  return {
    data: notificationEvents
      .map((event) => {
        const deliveries = deliveriesByEventId.get(event.id) ?? [];
        const emailJob = jobsByEventId.get(event.id) ?? null;
        return {
          ...event,
          deliveries,
          emailJob,
          latestDelivery: deliveries[0] ?? null,
          retryAuditEvents: emailJob
            ? (auditEventsByJobId.get(emailJob.id) ?? [])
            : [],
        };
      })
      .sort(compareAdminNotificationPriority),
    error: null,
  };
}
