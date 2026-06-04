import "server-only";
import { mailBrand, mailBrandColors } from "@/lib/communications/mailBrand";
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

function normalizeRecipients(value: EmailRecipients) {
  return Array.isArray(value) ? [...value] : [value];
}

function redactRecipients(value: EmailRecipients) {
  return normalizeRecipients(value)
    .map((recipient) => redactEmailAddress(recipient) ?? "[redacted email]")
    .join(", ");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildBrandedNotificationEmailHtml(options: {
  subject: string;
  text: string;
}) {
  const colors = mailBrandColors;
  const body = escapeHtml(options.text.trim()).replace(/\n/g, "<br />");

  return `<!doctype html>
<html>
  <body style="margin:0;background:${colors.paper};padding:24px 12px;font-family:Aptos,Segoe UI,Helvetica Neue,Arial,sans-serif;color:${colors.ink};">
    <div style="max-width:640px;margin:0 auto;background:${colors.surface};border:1px solid ${colors.line};border-radius:10px;overflow:hidden;">
      <div style="height:6px;background:${colors.gold};"></div>
      <div style="padding:28px 32px;border-bottom:1px solid ${colors.line};">
        <div style="margin-bottom:14px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${colors.goldStrong};font-weight:700;">${escapeHtml(
          mailBrand.brandName,
        )} • ${escapeHtml(mailBrand.descriptor)}</div>
        <h1 style="margin:0;font-size:24px;line-height:1.3;color:${colors.ink};">${escapeHtml(
          options.subject,
        )}</h1>
      </div>
      <div style="padding:32px;">
        <p style="margin:0;font-size:15px;line-height:1.7;color:${colors.ink};">${body}</p>
      </div>
      <div style="padding:24px 32px;border-top:1px solid ${colors.line};background:${colors.elevated};font-size:13px;line-height:1.7;color:${colors.muted};">
        <div>${escapeHtml(mailBrand.brandName)}</div>
        <div>${escapeHtml(mailBrand.descriptor)}</div>
        <div style="margin-top:8px;"><a href="${mailBrand.liveUrl}" style="color:${colors.coptic};text-decoration:none;">${mailBrand.liveUrl}</a></div>
      </div>
    </div>
  </body>
</html>`;
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

async function insertNotificationEmailJob(options: {
  bcc?: EmailRecipients;
  cc?: EmailRecipients;
  fromEmail?: string;
  html?: string;
  notificationEventId: string;
  replyTo?: EmailRecipients;
  subject: string;
  supabase: ReturnType<typeof createServiceRoleClient>;
  text: string;
  to: EmailRecipients;
}): Promise<{ id: string } | null> {
  const jobInsert = {
    ...(options.fromEmail ? { from_email: options.fromEmail } : {}),
    ...(options.html ? { html_body: options.html } : {}),
    ...(options.bcc
      ? { bcc_recipients: normalizeRecipients(options.bcc) }
      : {}),
    ...(options.cc ? { cc_recipients: normalizeRecipients(options.cc) } : {}),
    ...(options.replyTo
      ? { reply_to_recipients: normalizeRecipients(options.replyTo) }
      : {}),
    notification_event_id: options.notificationEventId,
    subject: options.subject,
    text_body: options.text,
    to_recipients: normalizeRecipients(options.to),
  } satisfies TablesInsert<"notification_email_jobs">;

  const { data, error } = await options.supabase
    .from("notification_email_jobs")
    .insert(jobInsert)
    .select("id")
    .single();

  if (error) {
    console.error("Failed to queue notification email job", {
      code: error.code,
      eventId: options.notificationEventId,
      message: error.message,
    });
    return null;
  }

  if (!data?.id) {
    console.error("Notification email job insert did not return an id", {
      eventId: options.notificationEventId,
    });
    return null;
  }

  return {
    id: data.id,
  };
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

  return buildBrandedNotificationEmailHtml({
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

  const recipient = redactRecipients(options.to);
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

  if (!storedEvent) {
    return {
      error: "Could not queue the notification event.",
      success: false,
    };
  }

  const queuedJob = await insertNotificationEmailJob({
    bcc: options.bcc,
    cc: options.cc,
    fromEmail: undefined,
    html: await renderNotificationEmailHtml({
      html: options.html,
      react: options.react,
      subject: options.subject,
      text: options.text,
    }),
    notificationEventId: storedEvent.id,
    replyTo: options.replyTo,
    subject: options.subject,
    supabase: storedEvent.supabase,
    text: options.text,
    to: options.to,
  });

  if (!queuedJob) {
    await updateNotificationEventStatus({
      eventId: storedEvent.id,
      lastError: "Could not queue the notification email job.",
      status: "failed",
      supabase: storedEvent.supabase,
    });

    return {
      error: "Could not queue the notification email job.",
      success: false,
    };
  }

  const invocation = await invokeSupabaseEdgeFunction(
    "process-notification-email",
    {
      jobId: queuedJob.id,
    },
  );

  if (!invocation.success) {
    console.error("Failed to start queued notification email worker", {
      error: invocation.error,
      eventId: storedEvent.id,
      jobId: queuedJob.id,
      status: invocation.status,
    });
  }

  return {
    eventId: storedEvent.id,
    jobId: queuedJob.id,
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
