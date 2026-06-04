import "server-only";
import { Resend } from "resend";

import { getNotificationEmailEnv } from "@/lib/notifications/config";
import { assertServerOnly } from "@/lib/server/assertServerOnly";

import type { ReactElement } from "react";

type EmailRecipients = string | readonly string[];

type BaseEmailOptions = {
  bcc?: EmailRecipients;
  cc?: EmailRecipients;
  from?: string;
  html?: string;
  react?: ReactElement;
  replyTo?: EmailRecipients;
  subject: string;
  text: string;
  to: EmailRecipients;
};

export type NotificationEmailResult =
  | {
      success: true;
      id: string | null;
    }
  | {
      success: false;
      error: string;
    };

type OwnerAlertEmailOptions = Omit<BaseEmailOptions, "to">;
type NotificationEmailPayload = {
  bcc?: string[];
  cc?: string[];
  from: string;
  html?: string;
  react?: ReactElement;
  replyTo?: string[];
  subject: string;
  text: string;
  to: string[];
};

function normalizeRecipients(value: EmailRecipients | undefined) {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? [...value] : [value];
}

function buildNotificationEmailPayload(
  options: BaseEmailOptions,
  env: NonNullable<ReturnType<typeof getNotificationEmailEnv>>,
): NotificationEmailPayload {
  const payload: NotificationEmailPayload = {
    from: options.from ?? env.notificationFromEmail,
    subject: options.subject,
    text: options.text,
    to: normalizeRecipients(options.to) ?? [],
  };

  if (options.html) {
    payload.html = options.html;
  }

  if (options.react) {
    payload.react = options.react;
  }

  if (options.replyTo) {
    payload.replyTo = normalizeRecipients(options.replyTo);
  }

  if (options.cc) {
    payload.cc = normalizeRecipients(options.cc);
  }

  if (options.bcc) {
    payload.bcc = normalizeRecipients(options.bcc);
  }

  return payload;
}

/**
 * Sends a transactional email through Resend and returns a non-throwing result
 * so callers can decide whether delivery failures should block the user flow.
 */
export async function sendNotificationEmail(
  options: BaseEmailOptions,
): Promise<NotificationEmailResult> {
  assertServerOnly("sendNotificationEmail");

  const env = getNotificationEmailEnv();
  if (!env) {
    return {
      success: false,
      error: "Notification email service is not configured.",
    };
  }

  const resend = new Resend(env.resendApiKey);
  const { data, error } = await resend.emails.send(
    buildNotificationEmailPayload(options, env),
  );

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to send notification email.",
    };
  }

  return {
    success: true,
    id: data?.id ?? null,
  };
}

/**
 * Resolves the configured owner-alert recipient and delegates to the generic
 * notification sender used by the rest of the app.
 */
export async function sendOwnerAlertEmail(
  options: OwnerAlertEmailOptions,
): Promise<NotificationEmailResult> {
  assertServerOnly("sendOwnerAlertEmail");

  const env = getNotificationEmailEnv();
  if (!env || !env.ownerAlertEmail) {
    return {
      success: false,
      error: "Owner alert email service is not configured.",
    };
  }

  return sendNotificationEmail({
    ...options,
    to: env.ownerAlertEmail,
  });
}
