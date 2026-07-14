import {
  buildProfileSignupNotificationDedupeKey,
  buildProfileSignupNotificationPayload,
  buildProfileSignupOwnerAlert,
  parseProfileSignupPayload,
  redactEmailAddress,
} from "../_shared/profileSignupAlert.ts";
import { hasExpectedHeaderValue } from "../_shared/requestAuth.ts";
import { sendResendEmail } from "../_shared/resendEmail.ts";

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

type SignupAlertEnv = {
  notificationFromEmail: string;
  ownerAlertEmail: string;
  resendApiKey: string;
  signupAlertWebhookToken: string;
  supabaseServiceRoleKey: string;
  supabaseUrl: string;
};

const SIGNUP_ALERT_WEBHOOK_TOKEN_HEADER = "x-signup-alert-webhook-token";
const MIN_SIGNUP_ALERT_WEBHOOK_TOKEN_LENGTH = 32;

/**
 * Builds small JSON responses for the webhook handler.
 */
function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
    status,
  });
}

/**
 * Builds the service-role headers used by the webhook to write notification
 * audit rows through the Supabase REST API.
 */
function buildSupabaseRestHeaders(serviceRoleKey: string) {
  return {
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    apikey: serviceRoleKey,
  };
}

function getRequiredSignupAlertWebhookToken() {
  const token = Deno.env.get("SIGNUP_ALERT_WEBHOOK_TOKEN")?.trim();
  if (!token || token.length < MIN_SIGNUP_ALERT_WEBHOOK_TOKEN_LENGTH) {
    return null;
  }

  return token;
}

/**
 * Creates the parent notification-event row for one signup alert email.
 * Duplicate dedupe keys are treated as a safe no-op for retried webhooks.
 */
async function insertNotificationEvent(options: {
  aggregateId: string;
  aggregateType: string;
  dedupeKey: string;
  eventType: string;
  payload: Record<string, string | null>;
  recipient: string;
  subject: string;
  supabaseServiceRoleKey: string;
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
        ...buildSupabaseRestHeaders(options.supabaseServiceRoleKey),
        Prefer: "return=representation",
      },
      method: "POST",
    },
  );

  if (response.ok) {
    const data = (await response.json()) as Array<{ id?: string }>;
    const eventId = data[0]?.id;

    if (!eventId) {
      console.error("Signup notification event insert returned no id.");
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
    return {
      eventId: null,
      inserted: false as const,
      duplicate: true as const,
    };
  }

  console.error("Failed to insert signup notification event.", {
    error: errorBody,
    status: response.status,
  });
  return null;
}

/**
 * Records one signup-alert delivery attempt on the notification delivery log.
 */
async function insertNotificationDelivery(options: {
  error: string | null;
  eventId: string;
  providerMessageId: string | null;
  recipient: string;
  status: "failed" | "sent";
  supabaseServiceRoleKey: string;
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
      headers: buildSupabaseRestHeaders(options.supabaseServiceRoleKey),
      method: "POST",
    },
  );

  if (!response.ok) {
    console.error("Failed to insert signup notification delivery.", {
      error: await response.text(),
      eventId: options.eventId,
      status: response.status,
    });
  }
}

/**
 * Marks the parent signup notification event as sent or failed after delivery
 * has completed.
 */
async function updateNotificationEventStatus(options: {
  eventId: string;
  lastError: string | null;
  status: "failed" | "sent";
  supabaseServiceRoleKey: string;
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
      headers: buildSupabaseRestHeaders(options.supabaseServiceRoleKey),
      method: "PATCH",
    },
  );

  if (!response.ok) {
    console.error("Failed to update signup notification event status.", {
      error: await response.text(),
      eventId: options.eventId,
      status: response.status,
    });
  }
}

/**
 * Loads the secrets required to deliver and audit signup owner alerts.
 */
function getSignupAlertEnv() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const ownerAlertEmail = Deno.env.get("OWNER_ALERT_EMAIL");
  const notificationFromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL");
  const signupAlertWebhookToken = getRequiredSignupAlertWebhookToken();

  if (
    !supabaseUrl ||
    !supabaseServiceRoleKey ||
    !resendApiKey ||
    !ownerAlertEmail ||
    !notificationFromEmail ||
    !signupAlertWebhookToken
  ) {
    return null;
  }

  return {
    notificationFromEmail,
    ownerAlertEmail,
    resendApiKey,
    signupAlertWebhookToken,
    supabaseServiceRoleKey,
    supabaseUrl,
  } satisfies SignupAlertEnv;
}

/**
 * Produces the redacted recipient value written to notification audit tables.
 */
function getRedactedRecipient(email: string) {
  return redactEmailAddress(email) ?? "[redacted email]";
}

/**
 * Parses the incoming webhook JSON and returns a ready-made error response when
 * the body is invalid.
 */
async function parseSignupAlertRequestPayload(request: Request) {
  try {
    return {
      payload: await request.json(),
      response: null,
    };
  } catch (error) {
    console.error("Failed to parse signup alert webhook payload.", error);
    return {
      payload: null,
      response: jsonResponse(400, { error: "Invalid JSON payload." }),
    };
  }
}

/**
 * Builds the notification-event insert payload for a parsed signup record.
 */
function getSignupAlertEventInsertOptions(options: {
  ownerAlertEmail: string;
  ownerAlertSubject: string;
  signupRecord: NonNullable<ReturnType<typeof parseProfileSignupPayload>>;
  supabaseServiceRoleKey: string;
  supabaseUrl: string;
}) {
  return {
    aggregateId: options.signupRecord.id,
    aggregateType: "profile",
    dedupeKey: buildProfileSignupNotificationDedupeKey(options.signupRecord),
    eventType: "profile_signup",
    payload: buildProfileSignupNotificationPayload(options.signupRecord),
    recipient: getRedactedRecipient(options.ownerAlertEmail),
    subject: options.ownerAlertSubject,
    supabaseServiceRoleKey: options.supabaseServiceRoleKey,
    supabaseUrl: options.supabaseUrl,
  };
}

/**
 * Sends the signup alert email and records the matching notification outcome
 * before returning the webhook response.
 */
async function deliverSignupOwnerAlert(options: {
  env: SignupAlertEnv;
  notificationEventId: string | null;
  ownerAlert: ReturnType<typeof buildProfileSignupOwnerAlert>;
  profileId: string;
}) {
  const emailResult = await sendResendEmail({
    apiKey: options.env.resendApiKey,
    from: options.env.notificationFromEmail,
    subject: options.ownerAlert.subject,
    text: options.ownerAlert.text,
    to: [options.env.ownerAlertEmail],
  });

  if (!emailResult.success) {
    await recordFailedSignupAlert({
      emailError: emailResult.error,
      eventId: options.notificationEventId,
      ownerAlertEmail: options.env.ownerAlertEmail,
      supabaseServiceRoleKey: options.env.supabaseServiceRoleKey,
      supabaseUrl: options.env.supabaseUrl,
    });

    console.error("Failed to send signup alert email.", {
      error: emailResult.error,
      profileId: options.profileId,
    });
    return jsonResponse(502, { error: "Failed to send signup alert email." });
  }

  await recordSentSignupAlert({
    eventId: options.notificationEventId,
    ownerAlertEmail: options.env.ownerAlertEmail,
    providerMessageId: emailResult.id,
    supabaseServiceRoleKey: options.env.supabaseServiceRoleKey,
    supabaseUrl: options.env.supabaseUrl,
  });

  return jsonResponse(200, {
    success: true,
    profileId: options.profileId,
  });
}

/**
 * Records a failed signup alert in the notification audit tables.
 */
async function recordFailedSignupAlert(options: {
  emailError: string;
  eventId: string | null;
  ownerAlertEmail: string;
  supabaseServiceRoleKey: string;
  supabaseUrl: string;
}) {
  if (!options.eventId) {
    return;
  }

  const recipient = getRedactedRecipient(options.ownerAlertEmail);
  await insertNotificationDelivery({
    error: options.emailError,
    eventId: options.eventId,
    providerMessageId: null,
    recipient,
    status: "failed",
    supabaseServiceRoleKey: options.supabaseServiceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });
  await updateNotificationEventStatus({
    eventId: options.eventId,
    lastError: options.emailError,
    status: "failed",
    supabaseServiceRoleKey: options.supabaseServiceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });
}

/**
 * Records a successful signup alert in the notification audit tables.
 */
async function recordSentSignupAlert(options: {
  eventId: string | null;
  ownerAlertEmail: string;
  providerMessageId: string | null;
  supabaseServiceRoleKey: string;
  supabaseUrl: string;
}) {
  if (!options.eventId) {
    return;
  }

  const recipient = getRedactedRecipient(options.ownerAlertEmail);
  await insertNotificationDelivery({
    error: null,
    eventId: options.eventId,
    providerMessageId: options.providerMessageId,
    recipient,
    status: "sent",
    supabaseServiceRoleKey: options.supabaseServiceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });
  await updateNotificationEventStatus({
    eventId: options.eventId,
    lastError: null,
    status: "sent",
    supabaseServiceRoleKey: options.supabaseServiceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });
}

/**
 * Validates the webhook request, parses the profile insert payload, and sends
 * the owner alert when the event has not already been processed.
 */
async function handleProfileSignupAlertRequest(request: Request) {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const env = getSignupAlertEnv();
  if (!env) {
    console.error("Missing one or more signup alert email secrets.");
    return jsonResponse(500, {
      error: "Signup alert email service is not configured.",
    });
  }

  if (
    !hasExpectedHeaderValue(
      request,
      SIGNUP_ALERT_WEBHOOK_TOKEN_HEADER,
      env.signupAlertWebhookToken,
    )
  ) {
    return jsonResponse(401, { error: "Unauthorized." });
  }

  const parsedPayload = await parseSignupAlertRequestPayload(request);
  if (parsedPayload.response) {
    return parsedPayload.response;
  }

  const signupRecord = parseProfileSignupPayload(parsedPayload.payload);
  if (!signupRecord) {
    return jsonResponse(202, {
      ignored: true,
      message: "Webhook payload did not contain a profile INSERT record.",
    });
  }

  const ownerAlert = buildProfileSignupOwnerAlert(signupRecord);
  const notificationEventOptions = getSignupAlertEventInsertOptions({
    ownerAlertEmail: env.ownerAlertEmail,
    ownerAlertSubject: ownerAlert.subject,
    signupRecord,
    supabaseServiceRoleKey: env.supabaseServiceRoleKey,
    supabaseUrl: env.supabaseUrl,
  });
  const notificationEvent = await insertNotificationEvent(
    notificationEventOptions,
  );

  if (notificationEvent?.duplicate) {
    return jsonResponse(200, {
      duplicate: true,
      profileId: signupRecord.id,
      success: true,
    });
  }

  return deliverSignupOwnerAlert({
    env,
    notificationEventId: notificationEvent?.eventId ?? null,
    ownerAlert,
    profileId: signupRecord.id,
  });
}

Deno.serve(handleProfileSignupAlertRequest);
