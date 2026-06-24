import {
  compareAdminNotificationPriority,
  notificationFailureStatuses,
  notificationHistoryStatuses,
  notificationInFlightStatuses,
  type AdminNotificationEvent,
  type NotificationDeliveryRow,
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

  const deliveriesByEventId = new Map<string, NotificationDeliveryRow[]>();

  for (const delivery of deliveriesResult.data ?? []) {
    const deliveries = deliveriesByEventId.get(delivery.event_id) ?? [];
    deliveries.push(delivery);
    deliveriesByEventId.set(delivery.event_id, deliveries);
  }

  return {
    data: notificationEvents
      .map((event) => {
        const deliveries = deliveriesByEventId.get(event.id) ?? [];
        return {
          ...event,
          deliveries,
          latestDelivery: deliveries[0] ?? null,
        };
      })
      .sort(compareAdminNotificationPriority),
    error: null,
  };
}
