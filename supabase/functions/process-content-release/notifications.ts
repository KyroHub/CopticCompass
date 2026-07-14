import { buildSupabaseRestHeaders } from "./supabaseRest.ts";

async function loadExistingNotificationEventId(options: {
  dedupeKey: string;
  serviceRoleKey: string;
  supabaseUrl: string;
}) {
  const response = await fetch(
    `${options.supabaseUrl}/rest/v1/notification_events?dedupe_key=eq.${encodeURIComponent(options.dedupeKey)}&select=id&limit=1`,
    {
      headers: buildSupabaseRestHeaders(options.serviceRoleKey),
      method: "GET",
    },
  );

  if (!response.ok) {
    console.error("Failed to load duplicate notification event id.", {
      dedupeKey: options.dedupeKey,
      error: await response.text(),
      status: response.status,
    });
    return null;
  }

  const data = (await response.json()) as Array<{ id?: string }>;
  return data[0]?.id ?? null;
}

/**
 * Inserts the notification event row used to audit one content-release email.
 * Duplicate dedupe keys are treated as a handled no-op so the worker can resume
 * safely.
 */
export async function insertNotificationEvent(options: {
  aggregateId: string;
  aggregateType: string;
  dedupeKey: string;
  eventType: string;
  payload: Record<string, string | number | null>;
  recipient: string;
  subject: string;
  serviceRoleKey: string;
  supabaseUrl: string;
}) {
  const response = await fetch(
    `${options.supabaseUrl}/rest/v1/notification_events?select=id`,
    {
      body: JSON.stringify({
        aggregate_id: options.aggregateId,
        aggregate_type: options.aggregateType,
        channel: "email",
        dedupe_key: options.dedupeKey,
        event_type: options.eventType,
        payload: options.payload,
        recipient: options.recipient,
        subject: options.subject,
      }),
      headers: {
        ...buildSupabaseRestHeaders(options.serviceRoleKey),
        Prefer: "return=representation",
      },
      method: "POST",
    },
  );

  if (response.ok) {
    const data = (await response.json()) as Array<{ id?: string }>;
    const eventId = data[0]?.id;

    if (!eventId) {
      console.error(
        "Content release notification event insert returned no id.",
        {
          dedupeKey: options.dedupeKey,
        },
      );
      return null;
    }

    return { eventId, inserted: true as const };
  }

  const errorBody = await response.text();
  if (
    response.status === 409 &&
    (errorBody.includes("notification_events_dedupe_key_key") ||
      errorBody.includes("23505") ||
      errorBody.includes("dedupe_key"))
  ) {
    const eventId = await loadExistingNotificationEventId({
      dedupeKey: options.dedupeKey,
      serviceRoleKey: options.serviceRoleKey,
      supabaseUrl: options.supabaseUrl,
    });

    if (!eventId) {
      return null;
    }

    return {
      eventId,
      inserted: false as const,
      duplicate: true as const,
    };
  }

  console.error("Failed to insert content release notification event.", {
    error: errorBody,
    status: response.status,
  });
  return null;
}

/**
 * Records the outcome of one notification delivery attempt for a content
 * release recipient.
 */
export async function insertNotificationDelivery(options: {
  error: string | null;
  eventId: string;
  providerMessageId: string | null;
  recipient: string;
  serviceRoleKey: string;
  status: "failed" | "sent";
  supabaseUrl: string;
}) {
  const response = await fetch(
    `${options.supabaseUrl}/rest/v1/notification_deliveries`,
    {
      body: JSON.stringify({
        channel: "email",
        error: options.error,
        event_id: options.eventId,
        provider_message_id: options.providerMessageId,
        recipient: options.recipient,
        status: options.status,
      }),
      headers: buildSupabaseRestHeaders(options.serviceRoleKey),
      method: "POST",
    },
  );

  if (!response.ok) {
    console.error("Failed to insert content release notification delivery.", {
      error: await response.text(),
      eventId: options.eventId,
      status: response.status,
    });
  }
}

/**
 * Marks the parent notification event as sent or failed after delivery has
 * finished.
 */
export async function updateNotificationEventStatus(options: {
  eventId: string;
  lastError: string | null;
  serviceRoleKey: string;
  status: "failed" | "sent";
  supabaseUrl: string;
}) {
  const response = await fetch(
    `${options.supabaseUrl}/rest/v1/notification_events?id=eq.${encodeURIComponent(options.eventId)}`,
    {
      body: JSON.stringify({
        last_error: options.lastError,
        processed_at: new Date().toISOString(),
        status: options.status,
      }),
      headers: buildSupabaseRestHeaders(options.serviceRoleKey),
      method: "PATCH",
    },
  );

  if (!response.ok) {
    console.error(
      "Failed to update content release notification event status.",
      {
        error: await response.text(),
        eventId: options.eventId,
        status: response.status,
      },
    );
  }
}
