import "server-only";
import { buildBrandedTransactionalEmailHtml } from "@/lib/communications/mailBrand";
import { getNotificationEmailEnv } from "@/lib/notifications/config";
import {
  sendNotificationEmail,
  type NotificationEmailResult,
} from "@/lib/notifications/email";
import { redactEmailAddress } from "@/lib/privacy";
import { assertServerOnly } from "@/lib/server/assertServerOnly";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/config";
import { invokeSupabaseEdgeFunction } from "@/lib/supabase/functions";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import type { Json, TablesInsert, TablesUpdate } from "@/types/supabase";

import type { ReactElement } from "react";

type EmailRecipients = string | readonly string[];

type LoggedNotificationEmailOptions = {
  aggregateId: string;
  aggregateType: string;
  bcc?: EmailRecipients;
  cc?: EmailRecipients;
  dedupeKey?: string | null;
  eventType: string;
  html?: string;
  payload?: Json;
  react?: ReactElement;
  replyTo?: EmailRecipients;
  requiredTransactional?: boolean;
  subject: string;
  text: string;
  to: EmailRecipients;
};

type LoggedOwnerAlertOptions = Omit<LoggedNotificationEmailOptions, "to">;
type NotificationQueueResult =
  | {
      eventId: string;
      jobId: string;
      success: true;
    }
  | {
      error: string;
      success: false;
    };

type EnqueuedNotificationEmailJob = {
  eventId: string;
  jobId: string;
};

type EnqueueNotificationEmailJobRpcRow = {
  event_id: string;
  event_status: TablesInsert<"notification_events">["status"];
  job_already_existed: boolean;
  job_id: string;
  job_status: TablesInsert<"notification_email_jobs">["status"];
};

function getEnqueuedNotificationEmailJob(
  data: EnqueueNotificationEmailJobRpcRow[] | null,
): EnqueuedNotificationEmailJob | null {
  const queuedJob = data?.[0] ?? null;

  if (!queuedJob?.event_id || !queuedJob.job_id) {
    return null;
  }

  return {
    eventId: queuedJob.event_id,
    jobId: queuedJob.job_id,
  };
}

function normalizeRecipients(value: EmailRecipients) {
  return Array.isArray(value) ? [...value] : [value];
}

function normalizeOptionalRecipients(value: EmailRecipients | undefined) {
  return value ? normalizeRecipients(value) : [];
}

function nullIfMissing<T>(value: T | null | undefined) {
  return value ?? null;
}

function redactRecipients(value: EmailRecipients) {
  return normalizeRecipients(value)
    .map((recipient) => redactEmailAddress(recipient) ?? "[redacted email]")
    .join(", ");
}

function isJsonRecord(value: Json | undefined): value is Record<string, Json> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function buildQueuedNotificationPayload(options: {
  payload?: Json;
  requiredTransactional: boolean;
}) {
  const payloadRecord = isJsonRecord(options.payload) ? options.payload : {};
  const classification = isJsonRecord(payloadRecord.notification_classification)
    ? payloadRecord.notification_classification
    : {};

  return {
    ...payloadRecord,
    notification_classification: {
      ...classification,
      required_transactional: options.requiredTransactional,
    },
  } satisfies Json;
}

async function insertNotificationEvent(options: {
  aggregateId: string;
  aggregateType: string;
  channel: "email";
  dedupeKey?: string | null;
  eventType: string;
  payload?: Json;
  recipient: string;
  subject: string;
}) {
  if (!hasSupabaseServiceRoleEnv()) {
    return null;
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("notification_events")
    .insert({
      aggregate_id: options.aggregateId,
      aggregate_type: options.aggregateType,
      channel: options.channel,
      dedupe_key: options.dedupeKey ?? null,
      event_type: options.eventType,
      payload: options.payload ?? {},
      recipient: options.recipient,
      subject: options.subject,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to store notification event", {
      aggregateId: options.aggregateId,
      aggregateType: options.aggregateType,
      code: error.code,
      eventType: options.eventType,
      message: error.message,
      recipient: options.recipient,
    });
    return null;
  }

  if (!data?.id) {
    console.error("Notification event insert did not return an id", {
      aggregateId: options.aggregateId,
      aggregateType: options.aggregateType,
      eventType: options.eventType,
      recipient: options.recipient,
    });
    return null;
  }

  return {
    id: data.id,
    supabase,
  };
}

async function enqueueNotificationEmailJob(options: {
  aggregateId: string;
  aggregateType: string;
  bcc?: EmailRecipients;
  cc?: EmailRecipients;
  dedupeKey?: string | null;
  eventType: string;
  fromEmail?: string;
  html?: string;
  payload?: Json;
  replyTo?: EmailRecipients;
  requiredTransactional: boolean;
  subject: string;
  text: string;
  to: EmailRecipients;
}): Promise<EnqueuedNotificationEmailJob | null> {
  if (!hasSupabaseServiceRoleEnv()) {
    return null;
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("enqueue_notification_email_job", {
    p_aggregate_id: options.aggregateId,
    p_aggregate_type: options.aggregateType,
    p_bcc_recipients: normalizeOptionalRecipients(options.bcc),
    p_cc_recipients: normalizeOptionalRecipients(options.cc),
    p_dedupe_key: nullIfMissing(options.dedupeKey),
    p_event_type: options.eventType,
    p_from_email: nullIfMissing(options.fromEmail),
    p_html_body: nullIfMissing(options.html),
    p_payload: buildQueuedNotificationPayload({
      payload: options.payload,
      requiredTransactional: options.requiredTransactional,
    }),
    p_recipient: redactRecipients(options.to),
    p_reply_to_recipients: normalizeOptionalRecipients(options.replyTo),
    p_subject: options.subject,
    p_text_body: options.text,
    p_to_recipients: normalizeRecipients(options.to),
  });

  if (error) {
    console.error("Failed to queue notification email job", {
      code: error.code,
      dedupeKey: options.dedupeKey,
      eventType: options.eventType,
      message: error.message,
    });
    return null;
  }

  const queuedJob = getEnqueuedNotificationEmailJob(data);
  if (!queuedJob) {
    console.error("Notification email enqueue RPC did not return ids", {
      aggregateId: options.aggregateId,
      eventType: options.eventType,
    });
    return null;
  }

  return queuedJob;
}

async function updateNotificationEventStatus(options: {
  eventId: string;
  lastError: string | null;
  status: "failed" | "sent";
  supabase: ReturnType<typeof createServiceRoleClient>;
}) {
  const { error } = await options.supabase
    .from("notification_events")
    .update({
      last_error: options.lastError,
      processed_at: new Date().toISOString(),
      status: options.status,
    } satisfies TablesUpdate<"notification_events">)
    .eq("id", options.eventId);

  if (error) {
    console.error("Failed to update notification event status", {
      code: error.code,
      eventId: options.eventId,
      message: error.message,
      status: options.status,
    });
  }
}

async function renderNotificationEmailHtml(options: {
  html?: string;
  react?: ReactElement;
  subject: string;
  text: string;
}) {
  if (options.html) {
    return options.html;
  }

  if (options.react) {
    const { renderToStaticMarkup } = await import("react-dom/server");
    return renderToStaticMarkup(options.react);
  }

  return buildBrandedTransactionalEmailHtml({
    subject: options.subject,
    text: options.text,
  });
}

/**
 * Persists the delivery attempt and updates the parent notification event so
 * admins can audit whether the email was sent, failed, or partially processed.
 */
async function recordNotificationOutcome(options: {
  eventId: string;
  recipient: string;
  result: NotificationEmailResult;
  supabase: ReturnType<typeof createServiceRoleClient>;
}) {
  const deliveryStatus: "sent" | "failed" = options.result.success
    ? "sent"
    : "failed";
  const deliveryInsert = {
    channel: "email" as const,
    error: options.result.success ? null : options.result.error,
    event_id: options.eventId,
    provider_message_id: options.result.success ? options.result.id : null,
    recipient: options.recipient,
    status: deliveryStatus,
  } satisfies TablesInsert<"notification_deliveries">;

  const { error: deliveryError } = await options.supabase
    .from("notification_deliveries")
    .insert(deliveryInsert);

  if (deliveryError) {
    console.error("Failed to store notification delivery", {
      code: deliveryError.code,
      eventId: options.eventId,
      message: deliveryError.message,
      recipient: options.recipient,
      status: deliveryStatus,
    });
  }

  await updateNotificationEventStatus({
    eventId: options.eventId,
    lastError: options.result.success ? null : options.result.error,
    status: deliveryStatus,
    supabase: options.supabase,
  });
}

/**
 * Sends an email and, when notification storage is configured, records the
 * event plus the final delivery outcome. Delivery is attempted even if event
 * persistence fails so user-facing flows can degrade without blocking.
 */
export async function dispatchLoggedNotificationEmail(
  options: LoggedNotificationEmailOptions,
): Promise<NotificationEmailResult> {
  assertServerOnly("dispatchLoggedNotificationEmail");

  const recipient = redactRecipients(options.to);
  const html =
    options.react && !options.html
      ? undefined
      : await renderNotificationEmailHtml({
          html: options.html,
          react: options.react,
          subject: options.subject,
          text: options.text,
        });
  const storedEvent = await insertNotificationEvent({
    aggregateId: options.aggregateId,
    aggregateType: options.aggregateType,
    channel: "email",
    dedupeKey: options.dedupeKey,
    eventType: options.eventType,
    payload: options.payload,
    recipient,
    subject: options.subject,
  });

  const result = await sendNotificationEmail({
    ...(options.bcc ? { bcc: options.bcc } : {}),
    ...(options.cc ? { cc: options.cc } : {}),
    ...(html ? { html } : {}),
    ...(options.react ? { react: options.react } : {}),
    ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    subject: options.subject,
    text: options.text,
    to: options.to,
  });

  if (storedEvent) {
    await recordNotificationOutcome({
      eventId: storedEvent.id,
      recipient,
      result,
      supabase: storedEvent.supabase,
    });
  }

  return result;
}

/**
 * Stores a queued notification event plus a worker job, then asks the
 * background edge function to deliver it without blocking the current action.
 */
export async function queueLoggedNotificationEmail(
  options: LoggedNotificationEmailOptions,
): Promise<NotificationQueueResult> {
  assertServerOnly("queueLoggedNotificationEmail");

  const queuedJob = await enqueueNotificationEmailJob({
    aggregateId: options.aggregateId,
    aggregateType: options.aggregateType,
    bcc: options.bcc,
    cc: options.cc,
    dedupeKey: options.dedupeKey,
    eventType: options.eventType,
    fromEmail: undefined,
    html: await renderNotificationEmailHtml({
      html: options.html,
      react: options.react,
      subject: options.subject,
      text: options.text,
    }),
    payload: options.payload,
    replyTo: options.replyTo,
    requiredTransactional: options.requiredTransactional ?? true,
    subject: options.subject,
    text: options.text,
    to: options.to,
  });

  if (!queuedJob) {
    return {
      error: "Could not queue the notification email job.",
      success: false,
    };
  }

  const invocation = await invokeSupabaseEdgeFunction(
    "process-notification-email",
    {
      jobId: queuedJob.jobId,
    },
  );

  if (!invocation.success) {
    console.error("Failed to start queued notification email worker", {
      error: invocation.error,
      eventId: queuedJob.eventId,
      jobId: queuedJob.jobId,
      status: invocation.status,
    });
  }

  return {
    eventId: queuedJob.eventId,
    jobId: queuedJob.jobId,
    success: true,
  };
}

/**
 * Queues an owner-alert email for background delivery after resolving the
 * configured owner recipient.
 */
export async function queueLoggedOwnerAlertEmail(
  options: LoggedOwnerAlertOptions,
): Promise<NotificationQueueResult> {
  assertServerOnly("queueLoggedOwnerAlertEmail");

  const env = getNotificationEmailEnv();
  if (!env || !env.ownerAlertEmail) {
    return {
      error: "Owner alert email service is not configured.",
      success: false,
    };
  }

  return queueLoggedNotificationEmail({
    ...options,
    to: env.ownerAlertEmail,
  });
}
