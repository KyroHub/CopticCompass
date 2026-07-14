import {
  buildNotificationEmailIdempotencyKey,
  classifyNotificationProviderFailure,
  getNotificationRetryDelaySeconds,
  type NotificationProviderFailure,
} from "../_shared/notificationEmailPolicy.ts";
import { hasExpectedBearerToken } from "../_shared/requestAuth.ts";
import { sendResendEmail } from "../_shared/resendEmail.ts";

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

declare const EdgeRuntime:
  | {
      waitUntil(promise: Promise<unknown>): void;
    }
  | undefined;

const NOTIFICATION_JOB_BATCH_SIZE = 5;
const NOTIFICATION_JOB_LEASE_SECONDS = 300;
const MIN_WORKER_BEARER_TOKEN_LENGTH = 32;

type NotificationEmailJobStatus =
  | "accepted"
  | "dead_letter"
  | "failed"
  | "processing"
  | "queued"
  | "retry_scheduled"
  | "sent";

type NotificationEmailJobRecord = {
  attempt_count: number;
  bcc_recipients: string[];
  cc_recipients: string[];
  from_email: string | null;
  html_body: string | null;
  id: string;
  last_error: string | null;
  lock_expires_at: string | null;
  locked_at: string | null;
  max_attempts: number;
  next_attempt_at: string;
  notification_event_id: string;
  provider_message_id: string | null;
  reply_to_recipients: string[];
  status: NotificationEmailJobStatus;
  subject: string;
  text_body: string;
  to_recipients: string[];
};

type ProcessNotificationEmailEnv = {
  notificationFromEmail: string;
  resendApiKey: string;
  serviceRoleKey: string;
  supabaseUrl: string;
  workerBearerToken: string;
};

type SendNotificationEmailResult =
  | {
      id: string | null;
      success: true;
    }
  | (NotificationProviderFailure & {
      success: false;
    });

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
    status,
  });
}

function getRequiredWorkerBearerToken() {
  const token = Deno.env.get("NOTIFICATION_WORKER_BEARER_TOKEN")?.trim();
  if (!token || token.length < MIN_WORKER_BEARER_TOKEN_LENGTH) {
    return null;
  }

  return token;
}

function getProcessNotificationEmailEnv() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const notificationFromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL");
  const workerBearerToken = getRequiredWorkerBearerToken();

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !resendApiKey ||
    !notificationFromEmail ||
    !workerBearerToken
  ) {
    return null;
  }

  return {
    notificationFromEmail,
    resendApiKey,
    serviceRoleKey,
    supabaseUrl,
    workerBearerToken,
  } satisfies ProcessNotificationEmailEnv;
}

function buildSupabaseRestHeaders(serviceRoleKey: string) {
  return {
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    apikey: serviceRoleKey,
  };
}

async function sendNotificationEmailThroughResend(options: {
  from: string;
  html?: string | null;
  idempotencyKey: string;
  resendApiKey: string;
  subject: string;
  text: string;
  to: string[];
  bcc?: string[];
  cc?: string[];
  replyTo?: string[];
}): Promise<SendNotificationEmailResult> {
  const result = await sendResendEmail({
    apiKey: options.resendApiKey,
    bcc: options.bcc,
    cc: options.cc,
    from: options.from,
    html: options.html,
    idempotencyKey: options.idempotencyKey,
    replyTo: options.replyTo,
    subject: options.subject,
    text: options.text,
    to: options.to,
  });

  if (result.success) {
    return result;
  }

  return {
    ...classifyNotificationProviderFailure({
      errorText: result.error,
      status: result.status,
    }),
    success: false as const,
  };
}

async function claimNotificationEmailJobs(options: {
  limit: number;
  serviceRoleKey: string;
  supabaseUrl: string;
  jobId?: string;
}) {
  const response = await fetch(
    `${options.supabaseUrl}/rest/v1/rpc/claim_notification_email_jobs`,
    {
      body: JSON.stringify({
        ...(options.jobId ? { p_job_id: options.jobId } : {}),
        p_lease_seconds: NOTIFICATION_JOB_LEASE_SECONDS,
        p_limit: options.jobId ? 1 : options.limit,
      }),
      headers: buildSupabaseRestHeaders(options.serviceRoleKey),
      method: "POST",
    },
  );

  if (!response.ok) {
    console.error("Failed to claim notification email jobs.", {
      error: await response.text(),
      jobId: options.jobId,
      status: response.status,
    });
    return [];
  }

  return (await response.json()) as NotificationEmailJobRecord[];
}

async function insertNotificationDelivery(options: {
  error: string | null;
  eventId: string;
  providerMessageId: string | null;
  recipient: string;
  serviceRoleKey: string;
  status: "accepted" | "delayed" | "failed";
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
    console.error("Failed to insert notification delivery.", {
      error: await response.text(),
      eventId: options.eventId,
      status: response.status,
    });
  }
}

async function updateNotificationEventStatus(options: {
  eventId: string;
  lastError: string | null;
  serviceRoleKey: string;
  status: "accepted" | "dead_letter" | "delayed" | "failed";
  supabaseUrl: string;
}) {
  const isTerminal =
    options.status === "accepted" ||
    options.status === "dead_letter" ||
    options.status === "failed";
  const response = await fetch(
    `${options.supabaseUrl}/rest/v1/notification_events?id=eq.${encodeURIComponent(options.eventId)}`,
    {
      body: JSON.stringify({
        last_error: options.lastError,
        processed_at: isTerminal ? new Date().toISOString() : null,
        status: options.status,
      }),
      headers: buildSupabaseRestHeaders(options.serviceRoleKey),
      method: "PATCH",
    },
  );

  if (!response.ok) {
    console.error("Failed to update notification event status.", {
      error: await response.text(),
      eventId: options.eventId,
      status: response.status,
    });
  }
}

async function updateNotificationEmailJob(options: {
  jobId: string;
  payload: Record<string, unknown>;
  serviceRoleKey: string;
  supabaseUrl: string;
}) {
  const response = await fetch(
    `${options.supabaseUrl}/rest/v1/notification_email_jobs?id=eq.${encodeURIComponent(options.jobId)}`,
    {
      body: JSON.stringify(options.payload),
      headers: buildSupabaseRestHeaders(options.serviceRoleKey),
      method: "PATCH",
    },
  );

  if (!response.ok) {
    console.error("Failed to update notification email job.", {
      error: await response.text(),
      jobId: options.jobId,
      status: response.status,
    });
  }
}

async function recordAcceptedNotificationEmailJob(options: {
  env: ProcessNotificationEmailEnv;
  job: NotificationEmailJobRecord;
  providerMessageId: string | null;
}) {
  const recipientSummary = options.job.to_recipients.join(", ");

  await insertNotificationDelivery({
    error: null,
    eventId: options.job.notification_event_id,
    providerMessageId: options.providerMessageId,
    recipient: recipientSummary,
    serviceRoleKey: options.env.serviceRoleKey,
    status: "accepted",
    supabaseUrl: options.env.supabaseUrl,
  });
  await updateNotificationEventStatus({
    eventId: options.job.notification_event_id,
    lastError: null,
    serviceRoleKey: options.env.serviceRoleKey,
    status: "accepted",
    supabaseUrl: options.env.supabaseUrl,
  });
  await updateNotificationEmailJob({
    jobId: options.job.id,
    payload: {
      last_error: null,
      lock_expires_at: null,
      locked_at: null,
      processed_at: new Date().toISOString(),
      provider_message_id: options.providerMessageId,
      status: "accepted",
    },
    serviceRoleKey: options.env.serviceRoleKey,
    supabaseUrl: options.env.supabaseUrl,
  });
}

async function recordFailedNotificationEmailJob(options: {
  env: ProcessNotificationEmailEnv;
  failure: NotificationProviderFailure;
  job: NotificationEmailJobRecord;
}) {
  const exhausted = options.job.attempt_count >= options.job.max_attempts;
  const eventStatus = exhausted ? "dead_letter" : "delayed";
  const jobStatus = exhausted ? "dead_letter" : "retry_scheduled";
  const deliveryStatus = exhausted ? "failed" : "delayed";
  const nextAttemptDelaySeconds = getNotificationRetryDelaySeconds({
    attemptCount: options.job.attempt_count,
    jobId: options.job.id,
  });
  const nextAttemptAt = new Date(
    Date.now() + nextAttemptDelaySeconds * 1000,
  ).toISOString();
  const recipientSummary = options.job.to_recipients.join(", ");

  await insertNotificationDelivery({
    error: options.failure.error,
    eventId: options.job.notification_event_id,
    providerMessageId: null,
    recipient: recipientSummary,
    serviceRoleKey: options.env.serviceRoleKey,
    status: deliveryStatus,
    supabaseUrl: options.env.supabaseUrl,
  });
  await updateNotificationEventStatus({
    eventId: options.job.notification_event_id,
    lastError: options.failure.error,
    serviceRoleKey: options.env.serviceRoleKey,
    status: eventStatus,
    supabaseUrl: options.env.supabaseUrl,
  });
  await updateNotificationEmailJob({
    jobId: options.job.id,
    payload: {
      last_error: options.failure.error,
      lock_expires_at: null,
      locked_at: null,
      next_attempt_at: exhausted ? options.job.next_attempt_at : nextAttemptAt,
      processed_at: exhausted ? new Date().toISOString() : null,
      status: jobStatus,
    },
    serviceRoleKey: options.env.serviceRoleKey,
    supabaseUrl: options.env.supabaseUrl,
  });
}

async function recordPermanentNotificationEmailJobFailure(options: {
  env: ProcessNotificationEmailEnv;
  failure: NotificationProviderFailure;
  job: NotificationEmailJobRecord;
}) {
  const recipientSummary = options.job.to_recipients.join(", ");

  await insertNotificationDelivery({
    error: options.failure.error,
    eventId: options.job.notification_event_id,
    providerMessageId: null,
    recipient: recipientSummary,
    serviceRoleKey: options.env.serviceRoleKey,
    status: "failed",
    supabaseUrl: options.env.supabaseUrl,
  });
  await updateNotificationEventStatus({
    eventId: options.job.notification_event_id,
    lastError: options.failure.error,
    serviceRoleKey: options.env.serviceRoleKey,
    status: "failed",
    supabaseUrl: options.env.supabaseUrl,
  });
  await updateNotificationEmailJob({
    jobId: options.job.id,
    payload: {
      last_error: options.failure.error,
      lock_expires_at: null,
      locked_at: null,
      processed_at: new Date().toISOString(),
      status: "failed",
    },
    serviceRoleKey: options.env.serviceRoleKey,
    supabaseUrl: options.env.supabaseUrl,
  });
}

async function processClaimedNotificationEmailJob(options: {
  env: ProcessNotificationEmailEnv;
  job: NotificationEmailJobRecord;
}) {
  const emailResult = await sendNotificationEmailThroughResend({
    ...(options.job.bcc_recipients.length > 0
      ? { bcc: options.job.bcc_recipients }
      : {}),
    ...(options.job.cc_recipients.length > 0
      ? { cc: options.job.cc_recipients }
      : {}),
    ...(options.job.reply_to_recipients.length > 0
      ? { replyTo: options.job.reply_to_recipients }
      : {}),
    from: options.job.from_email ?? options.env.notificationFromEmail,
    html: options.job.html_body,
    idempotencyKey: buildNotificationEmailIdempotencyKey({
      jobId: options.job.id,
      notificationEventId: options.job.notification_event_id,
    }),
    resendApiKey: options.env.resendApiKey,
    subject: options.job.subject,
    text: options.job.text_body,
    to: options.job.to_recipients,
  });

  if (emailResult.success) {
    await recordAcceptedNotificationEmailJob({
      env: options.env,
      job: options.job,
      providerMessageId: emailResult.id,
    });
    return;
  }

  if (emailResult.kind === "retryable") {
    await recordFailedNotificationEmailJob({
      env: options.env,
      failure: emailResult,
      job: options.job,
    });
    return;
  }

  await recordPermanentNotificationEmailJobFailure({
    env: options.env,
    failure: emailResult,
    job: options.job,
  });
}

async function processClaimedJobWithRecovery(options: {
  env: ProcessNotificationEmailEnv;
  job: NotificationEmailJobRecord;
}) {
  try {
    await processClaimedNotificationEmailJob(options);
  } catch (error) {
    const failure = classifyNotificationProviderFailure({
      errorText:
        error instanceof Error
          ? error.message
          : "The notification email job failed unexpectedly.",
      status: null,
    });
    console.error("Notification email job failed unexpectedly.", {
      error: failure.error,
      jobId: options.job.id,
    });
    await recordFailedNotificationEmailJob({
      env: options.env,
      failure,
      job: options.job,
    });
  }
}

async function processQueuedNotificationEmailJobs(options: {
  env: ProcessNotificationEmailEnv;
  limit: number;
  jobId?: string;
}) {
  const claimedJobs = await claimNotificationEmailJobs({
    jobId: options.jobId,
    limit: options.limit,
    serviceRoleKey: options.env.serviceRoleKey,
    supabaseUrl: options.env.supabaseUrl,
  });

  for (const job of claimedJobs) {
    await processClaimedJobWithRecovery({
      env: options.env,
      job,
    });
  }
}

async function parseWorkerInvocationRequest(request: Request) {
  try {
    const body = (await request.json()) as {
      jobId?: unknown;
      limit?: unknown;
    } | null;
    const jobId =
      body && typeof body.jobId === "string" && body.jobId.trim().length > 0
        ? body.jobId.trim()
        : undefined;
    const requestedLimit =
      body && typeof body.limit === "number" && Number.isFinite(body.limit)
        ? Math.trunc(body.limit)
        : NOTIFICATION_JOB_BATCH_SIZE;
    const limit = Math.min(Math.max(requestedLimit, 1), 25);

    return { jobId, limit };
  } catch {
    return { jobId: undefined, limit: NOTIFICATION_JOB_BATCH_SIZE };
  }
}

async function scheduleNotificationJobProcessing(options: {
  env: ProcessNotificationEmailEnv;
  limit: number;
  jobId?: string;
}) {
  const backgroundTask = processQueuedNotificationEmailJobs(options);

  if (
    typeof EdgeRuntime !== "undefined" &&
    typeof EdgeRuntime.waitUntil === "function"
  ) {
    EdgeRuntime.waitUntil(backgroundTask);
    return;
  }

  await backgroundTask;
}

async function handleProcessNotificationEmailRequest(request: Request) {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const env = getProcessNotificationEmailEnv();
  if (!env) {
    console.error("Missing one or more notification email worker secrets.");
    return jsonResponse(500, {
      error: "Notification email processing is not configured.",
    });
  }

  if (!hasExpectedBearerToken(request, env.workerBearerToken)) {
    return jsonResponse(401, { error: "Unauthorized." });
  }

  const invocation = await parseWorkerInvocationRequest(request);
  await scheduleNotificationJobProcessing({
    env,
    limit: invocation.limit,
    ...(invocation.jobId ? { jobId: invocation.jobId } : {}),
  });

  return jsonResponse(202, {
    ...(invocation.jobId ? { jobId: invocation.jobId } : {}),
    limit: invocation.limit,
    queued: true,
    success: true,
  });
}

Deno.serve(handleProcessNotificationEmailRequest);
