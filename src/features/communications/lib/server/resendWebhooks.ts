import "server-only";

import { Resend } from "resend";

import { COMMUNICATIONS_POLICY_VERSION } from "@/features/communications/lib/server/audience";
import { readBooleanEnv, type EnvSource } from "@/lib/env";
import { redactEmailAddress } from "@/lib/privacy";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import type { Json, Tables, TablesInsert } from "@/types/supabase";

type ServiceRoleLike = {
  from(table: string): SupabaseTableLike;
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): PromiseLike<SupabaseResult<unknown>>;
};
type SupabaseError = { code?: string; message?: string } | null;
type SupabaseResult<T> = { data: T; error: SupabaseError };
type SupabaseInsertSelectQuery<T> = {
  select(columns: string): {
    single(): PromiseLike<SupabaseResult<T>>;
  };
};
type SupabaseInsertQuery = PromiseLike<SupabaseResult<null>>;
type SupabaseSelectEqMaybeSingleQuery<T> = {
  eq(
    column: string,
    value: unknown,
  ): {
    maybeSingle(): PromiseLike<SupabaseResult<T>>;
  };
};
type SupabaseSelectEqQuery<T> = {
  eq(column: string, value: unknown): PromiseLike<SupabaseResult<T>>;
};
type SupabaseSelectInQuery<T> = {
  in(column: string, values: unknown[]): PromiseLike<SupabaseResult<T>>;
};
type SupabaseUpdateQuery = {
  eq(column: string, value: unknown): PromiseLike<SupabaseResult<null>>;
};
type SupabaseTableLike = {
  insert(payload: unknown): unknown;
  select(columns: string): unknown;
  update(payload: unknown): SupabaseUpdateQuery;
};
type ResendWebhookClient = {
  contacts: {
    topics: {
      list(options: Record<string, unknown>): Promise<{
        data: {
          data: Array<{ id: string; subscription: "opt_in" | "opt_out" }>;
        } | null;
        error: { message: string } | null;
      }>;
    };
  };
  webhooks: {
    verify(options: {
      headers: WebhookVerificationHeaders;
      payload: string;
      webhookSecret: string;
    }): unknown;
  };
};
type ResendWebhookPayload = ReturnType<Resend["webhooks"]["verify"]>;
type ResendWebhookEventType = ResendWebhookPayload["type"];
type ResendEmailLifecycleStatus =
  | "accepted"
  | "bounced"
  | "complained"
  | "delayed"
  | "delivered"
  | "failed"
  | "suppressed";
type NotificationDeliveryRow = Pick<
  Tables<"notification_deliveries">,
  "event_id" | "id" | "status"
>;
type NotificationEventRow = Pick<
  Tables<"notification_events">,
  "id" | "status"
>;
type ContentReleaseTargetLifecycleRow = Pick<
  Tables<"content_release_targets">,
  "accepted_at" | "id" | "last_provider_status"
>;
type AudienceContactRow = Tables<"audience_contacts">;
type AudienceSuppressionReason =
  TablesInsert<"audience_suppressions">["reason"];
type AudienceTopic = Exclude<
  TablesInsert<"audience_consent_events">["topic"],
  "all"
>;

type WebhookVerificationHeaders = {
  id: string;
  signature: string;
  timestamp: string;
};

type ResendWebhookProcessingOutcome = {
  detail?: string;
  status: "ignored" | "processed";
};

type HandlerDependencies = {
  createResend?: (apiKey: string) => unknown;
  createSupabase?: () => unknown;
  env?: EnvSource;
};

type StoredWebhookEvent =
  | { duplicate: false; id: string }
  | { duplicate: true; id: null };

const RESEND_SUPPORTED_WEBHOOK_EVENTS = new Set<ResendWebhookEventType>([
  "contact.updated",
  "email.bounced",
  "email.complained",
  "email.delivered",
  "email.delivery_delayed",
  "email.failed",
  "email.sent",
  "email.suppressed",
]);

const DELIVERY_STATUS_PRECEDENCE: Record<
  | ResendEmailLifecycleStatus
  | Tables<"notification_deliveries">["status"]
  | Tables<"notification_events">["status"],
  number
> = {
  accepted: 1,
  bounced: 4,
  complained: 5,
  dead_letter: 4,
  delayed: 2,
  delivered: 3,
  failed: 4,
  processing: 0,
  queued: 0,
  sent: 1,
  suppressed: 4,
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
    status,
  });
}

function getWebhookSecret(env: EnvSource) {
  return env.RESEND_WEBHOOK_SECRET?.trim() || null;
}

function getResendApiKey(env: EnvSource) {
  return (
    env.RESEND_API_KEY_FULL_ACCESS?.trim() ||
    env.RESEND_API_KEY?.trim() ||
    "re_webhook_verification_placeholder"
  );
}

function getSvixHeaders(request: Request): WebhookVerificationHeaders | null {
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");

  if (!id || !timestamp || !signature) {
    return null;
  }

  return { id, signature, timestamp };
}

function isUniqueViolation(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "23505" ||
    error?.message?.includes("duplicate key") ||
    error?.message?.includes(
      "provider_webhook_events_provider_provider_event_id",
    )
  );
}

function getProviderCreatedAt(event: ResendWebhookPayload) {
  return event.created_at ?? event.data.created_at ?? null;
}

async function recordProviderWebhookEvent(options: {
  event: ResendWebhookPayload;
  providerEventId: string;
  supabase: ServiceRoleLike;
}) {
  const payload = {
    event_type: options.event.type,
    payload: options.event as unknown as Json,
    provider: "resend",
    provider_created_at: getProviderCreatedAt(options.event),
    provider_event_id: options.providerEventId,
    status: "received",
  } satisfies TablesInsert<"provider_webhook_events">;

  const insertQuery = options.supabase
    .from("provider_webhook_events")
    .insert(payload) as SupabaseInsertSelectQuery<{ id: string } | null>;
  const { data, error } = await insertQuery.select("id").single();

  if (isUniqueViolation(error)) {
    return { duplicate: true as const, id: null };
  }

  if (error || !data) {
    throw new Error(
      error?.message ?? "Could not store provider webhook event.",
    );
  }

  return { duplicate: false as const, id: data.id as string };
}

async function markProviderWebhookEvent(options: {
  error?: string | null;
  id: string;
  status: "failed" | "ignored" | "processed";
  supabase: ServiceRoleLike;
}) {
  await options.supabase
    .from("provider_webhook_events")
    .update({
      last_error: options.error ?? null,
      processed_at: new Date().toISOString(),
      status: options.status,
    })
    .eq("id", options.id);
}

function getEmailLifecycleStatus(
  eventType: ResendWebhookEventType,
): ResendEmailLifecycleStatus | null {
  switch (eventType) {
    case "email.sent":
      return "accepted";
    case "email.delivered":
      return "delivered";
    case "email.delivery_delayed":
      return "delayed";
    case "email.failed":
      return "failed";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    case "email.suppressed":
      return "suppressed";
    default:
      return null;
  }
}

function shouldApplyLifecycleStatus(
  currentStatus:
    | Tables<"notification_deliveries">["status"]
    | Tables<"notification_events">["status"],
  nextStatus: ResendEmailLifecycleStatus,
) {
  return (
    DELIVERY_STATUS_PRECEDENCE[nextStatus] >=
    DELIVERY_STATUS_PRECEDENCE[currentStatus]
  );
}

function shouldApplyProviderLifecycleStatus(
  currentStatus: ContentReleaseTargetLifecycleRow["last_provider_status"],
  nextStatus: ResendEmailLifecycleStatus,
) {
  if (!currentStatus) {
    return true;
  }

  return (
    DELIVERY_STATUS_PRECEDENCE[nextStatus] >=
    DELIVERY_STATUS_PRECEDENCE[currentStatus]
  );
}

async function updateNotificationEvents(options: {
  error: string | null;
  eventIds: string[];
  status: ResendEmailLifecycleStatus;
  supabase: ServiceRoleLike;
}) {
  if (options.eventIds.length === 0) {
    return;
  }

  const selectQuery = options.supabase
    .from("notification_events")
    .select("id,status") as SupabaseSelectInQuery<NotificationEventRow[]>;
  const { data: events, error } = await selectQuery.in("id", options.eventIds);

  if (error) {
    throw new Error(error.message);
  }

  for (const event of (events ?? []) as NotificationEventRow[]) {
    if (!shouldApplyLifecycleStatus(event.status, options.status)) {
      continue;
    }

    await options.supabase
      .from("notification_events")
      .update({
        last_error: options.error,
        processed_at: new Date().toISOString(),
        status: options.status,
      })
      .eq("id", event.id);
  }
}

async function updateNotificationLifecycle(options: {
  error: string | null;
  providerMessageId: string | null;
  status: ResendEmailLifecycleStatus;
  supabase: ServiceRoleLike;
}) {
  if (!options.providerMessageId) {
    return;
  }

  const selectQuery = options.supabase
    .from("notification_deliveries")
    .select("id,event_id,status") as SupabaseSelectEqQuery<
    NotificationDeliveryRow[]
  >;
  const { data: deliveries, error } = await selectQuery.eq(
    "provider_message_id",
    options.providerMessageId,
  );

  if (error) {
    throw new Error(error.message);
  }

  const updatedEventIds = new Set<string>();

  for (const delivery of (deliveries ?? []) as NotificationDeliveryRow[]) {
    if (!shouldApplyLifecycleStatus(delivery.status, options.status)) {
      continue;
    }

    await options.supabase
      .from("notification_deliveries")
      .update({
        error: options.error,
        status: options.status,
      })
      .eq("id", delivery.id);
    updatedEventIds.add(delivery.event_id);
  }

  await updateNotificationEvents({
    error: options.error,
    eventIds: [...updatedEventIds],
    status: options.status,
    supabase: options.supabase,
  });
}

function getEmailEventRecipients(event: ResendWebhookPayload) {
  if (
    !event.type.startsWith("email.") ||
    !("to" in event.data) ||
    !Array.isArray(event.data.to)
  ) {
    return [];
  }

  return event.data.to
    .filter((recipient): recipient is string => typeof recipient === "string")
    .map((recipient) => recipient.trim().toLowerCase())
    .filter((recipient) => recipient.length > 0);
}

function getEmailEventMessageId(event: ResendWebhookPayload) {
  if (
    !event.type.startsWith("email.") ||
    !("email_id" in event.data) ||
    typeof event.data.email_id !== "string"
  ) {
    return null;
  }

  return event.data.email_id;
}

function getEmailEventBroadcastId(event: ResendWebhookPayload) {
  if (
    !event.type.startsWith("email.") ||
    !("broadcast_id" in event.data) ||
    typeof event.data.broadcast_id !== "string"
  ) {
    return null;
  }

  return event.data.broadcast_id;
}

function sanitizeDiagnosticToken(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return normalized.length > 0 ? normalized : null;
}

function getEmailEventDiagnosticCode(event: ResendWebhookPayload) {
  if (event.type === "email.failed") {
    return `failed:${sanitizeDiagnosticToken(event.data.failed.reason) ?? "unknown"}`;
  }

  if (event.type === "email.bounced") {
    const bounceType = sanitizeDiagnosticToken(event.data.bounce.type);
    const bounceSubType = sanitizeDiagnosticToken(event.data.bounce.subType);
    return ["bounced", bounceType, bounceSubType].filter(Boolean).join(":");
  }

  if (event.type === "email.suppressed") {
    return "suppressed";
  }

  if (event.type === "email.complained") {
    return "complained";
  }

  if (event.type === "email.delivery_delayed") {
    return "delayed";
  }

  return null;
}

function getTargetLifecycleTimestampColumn(status: ResendEmailLifecycleStatus) {
  switch (status) {
    case "bounced":
      return "bounced_at";
    case "complained":
      return "complained_at";
    case "delayed":
      return "delayed_at";
    case "delivered":
      return "delivered_at";
    case "suppressed":
      return "suppressed_at";
    default:
      return null;
  }
}

async function updateContentReleaseTargetLifecycle(options: {
  event: ResendWebhookPayload;
  providerEventId: string;
  status: ResendEmailLifecycleStatus;
  supabase: ServiceRoleLike;
}) {
  const providerBroadcastId = getEmailEventBroadcastId(options.event);
  if (!providerBroadcastId) {
    return;
  }

  const selectQuery = options.supabase
    .from("content_release_targets")
    .select(
      "accepted_at,id,last_provider_status",
    ) as SupabaseSelectEqMaybeSingleQuery<ContentReleaseTargetLifecycleRow | null>;
  const { data: target, error } = await selectQuery
    .eq("provider_broadcast_id", providerBroadcastId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (
    !target ||
    !shouldApplyProviderLifecycleStatus(
      target.last_provider_status,
      options.status,
    )
  ) {
    return;
  }

  const occurredAt =
    getProviderCreatedAt(options.event) ?? new Date().toISOString();
  const timestampColumn = getTargetLifecycleTimestampColumn(options.status);
  const payload: Record<string, unknown> = {
    last_provider_error: getEmailEventDiagnosticCode(options.event),
    last_provider_event_id: options.providerEventId,
    last_provider_status: options.status,
    provider_status_updated_at: occurredAt,
  };

  if (timestampColumn) {
    payload[timestampColumn] = occurredAt;
  }

  if (options.status === "accepted" && !target.accepted_at) {
    payload.accepted_at = occurredAt;
    payload.status = "accepted";
  }

  const { error: updateError } = await options.supabase
    .from("content_release_targets")
    .update(payload)
    .eq("id", target.id);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

function getSuppressionReasonForEvent(
  event: ResendWebhookPayload,
): AudienceSuppressionReason | null {
  switch (event.type) {
    case "email.bounced":
      return "hard_bounce";
    case "email.complained":
      return "spam_complaint";
    case "email.suppressed":
      return "provider_unsubscribe";
    default:
      return null;
  }
}

async function loadAudienceContactByEmail(options: {
  email: string;
  supabase: ServiceRoleLike;
}) {
  const selectQuery = options.supabase
    .from("audience_contacts")
    .select("*") as SupabaseSelectEqMaybeSingleQuery<AudienceContactRow | null>;
  const { data, error } = await selectQuery
    .eq("email", options.email)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as AudienceContactRow | null;
}

async function applyProviderAudiencePreferences(options: {
  booksOptIn: boolean;
  dedupePrefix: string;
  email: string;
  fullName?: string | null;
  generalUpdatesOptIn: boolean;
  lessonsOptIn: boolean;
  locale?: "en" | "nl" | null;
  occurredAt: string;
  supabase: ServiceRoleLike;
}) {
  const { data, error } = await options.supabase.rpc(
    "apply_audience_preferences",
    {
      p_actor: "provider",
      p_books_opt_in: options.booksOptIn,
      p_dedupe_prefix: options.dedupePrefix,
      p_email: options.email,
      p_full_name: options.fullName ?? null,
      p_general_updates_opt_in: options.generalUpdatesOptIn,
      p_lessons_opt_in: options.lessonsOptIn,
      p_locale: options.locale ?? "en",
      p_occurred_at: options.occurredAt,
      p_opt_in_request_id: null,
      p_policy_version: COMMUNICATIONS_POLICY_VERSION,
      p_profile_id: null,
      p_source: "resend_webhook",
    },
  );

  if (error || !data) {
    throw new Error(error?.message ?? "Could not apply provider preferences.");
  }

  return data as AudienceContactRow;
}

async function appendSuppressionLedgerEvent(options: {
  audienceContactId: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
  providerEventId: string;
  reason: AudienceSuppressionReason;
  supabase: ServiceRoleLike;
}) {
  const insertQuery = options.supabase.from("audience_consent_events").insert({
    action: "suppressed",
    audience_contact_id: options.audienceContactId,
    dedupe_key: `resend-webhook:${options.providerEventId}:suppressed:${options.reason}`,
    metadata: options.metadata as Json,
    occurred_at: options.occurredAt,
    policy_version: COMMUNICATIONS_POLICY_VERSION,
    provider_event_id: options.providerEventId,
    source: "resend_webhook",
    topic: "all",
  } satisfies TablesInsert<"audience_consent_events">) as SupabaseInsertQuery;
  const { error } = await insertQuery;

  if (error && !isUniqueViolation(error)) {
    throw new Error(error.message);
  }
}

async function ensureAudienceSuppression(options: {
  contact: AudienceContactRow;
  metadata: Record<string, unknown>;
  occurredAt: string;
  providerEventId: string;
  reason: AudienceSuppressionReason;
  supabase: ServiceRoleLike;
}) {
  const insertQuery = options.supabase.from("audience_suppressions").insert({
    audience_contact_id: options.contact.id,
    metadata: options.metadata as Json,
    provider: "resend",
    provider_event_id: options.providerEventId,
    reason: options.reason,
    suppressed_at: options.occurredAt,
  } satisfies TablesInsert<"audience_suppressions">) as SupabaseInsertQuery;
  const { error } = await insertQuery;

  if (error && !isUniqueViolation(error)) {
    throw new Error(error.message);
  }

  await appendSuppressionLedgerEvent({
    audienceContactId: options.contact.id,
    metadata: options.metadata,
    occurredAt: options.occurredAt,
    providerEventId: options.providerEventId,
    reason: options.reason,
    supabase: options.supabase,
  });
}

async function restrictAudienceForProviderSuppression(options: {
  email: string;
  event: ResendWebhookPayload;
  providerEventId: string;
  reason: AudienceSuppressionReason;
  supabase: ServiceRoleLike;
}) {
  const contact =
    (await loadAudienceContactByEmail({
      email: options.email,
      supabase: options.supabase,
    })) ??
    (await applyProviderAudiencePreferences({
      booksOptIn: false,
      dedupePrefix: `resend-webhook:${options.providerEventId}:seed`,
      email: options.email,
      generalUpdatesOptIn: false,
      lessonsOptIn: false,
      occurredAt:
        getProviderCreatedAt(options.event) ?? new Date().toISOString(),
      supabase: options.supabase,
    }));

  const occurredAt =
    getProviderCreatedAt(options.event) ?? new Date().toISOString();

  if (
    contact.books_opt_in ||
    contact.general_updates_opt_in ||
    contact.lessons_opt_in
  ) {
    await applyProviderAudiencePreferences({
      booksOptIn: false,
      dedupePrefix: `resend-webhook:${options.providerEventId}:restrict`,
      email: contact.email,
      fullName: contact.full_name,
      generalUpdatesOptIn: false,
      lessonsOptIn: false,
      locale: contact.locale,
      occurredAt,
      supabase: options.supabase,
    });
  }

  await ensureAudienceSuppression({
    contact,
    metadata: {
      event_type: options.event.type,
      provider_message_id: getEmailEventMessageId(options.event),
    },
    occurredAt,
    providerEventId: options.providerEventId,
    reason: options.reason,
    supabase: options.supabase,
  });
}

async function processEmailEvent(options: {
  event: ResendWebhookPayload;
  providerEventId: string;
  supabase: ServiceRoleLike;
}) {
  const status = getEmailLifecycleStatus(options.event.type);
  if (!status) {
    return { status: "ignored" as const };
  }

  await updateNotificationLifecycle({
    error: getEmailEventDiagnosticCode(options.event),
    providerMessageId: getEmailEventMessageId(options.event),
    status,
    supabase: options.supabase,
  });

  await updateContentReleaseTargetLifecycle({
    event: options.event,
    providerEventId: options.providerEventId,
    status,
    supabase: options.supabase,
  });

  const suppressionReason = getSuppressionReasonForEvent(options.event);
  if (!suppressionReason) {
    return { status: "processed" as const };
  }

  for (const email of getEmailEventRecipients(options.event)) {
    await restrictAudienceForProviderSuppression({
      email,
      event: options.event,
      providerEventId: options.providerEventId,
      reason: suppressionReason,
      supabase: options.supabase,
    });
  }

  return { status: "processed" as const };
}

function getManagedTopicEnv(env: EnvSource) {
  const lessons = env.RESEND_LESSONS_TOPIC_ID?.trim();
  const books = env.RESEND_BOOKS_TOPIC_ID?.trim();
  const general = env.RESEND_GENERAL_TOPIC_ID?.trim();

  if (!lessons || !books || !general) {
    return null;
  }

  return {
    books,
    general,
    lessons,
  };
}

function getTopicKeyById(
  topicId: string,
  topics: NonNullable<ReturnType<typeof getManagedTopicEnv>>,
): AudienceTopic | null {
  if (topicId === topics.lessons) {
    return "lessons";
  }

  if (topicId === topics.books) {
    return "books";
  }

  if (topicId === topics.general) {
    return "general_updates";
  }

  return null;
}

async function getProviderTopicOptOuts(options: {
  contactId: string;
  env: EnvSource;
  resend: Pick<ResendWebhookClient, "contacts">;
}) {
  const topics = getManagedTopicEnv(options.env);
  if (!topics || !options.env.RESEND_API_KEY_FULL_ACCESS?.trim()) {
    return [];
  }

  const { data, error } = await options.resend.contacts.topics.list({
    id: options.contactId,
    limit: 100,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data?.data ?? [])
    .filter((topic) => topic.subscription === "opt_out")
    .map((topic) => getTopicKeyById(topic.id, topics))
    .filter((topic): topic is AudienceTopic => topic !== null);
}

function getContactUpdatedFullName(
  event: Extract<ResendWebhookPayload, { type: "contact.updated" }>,
) {
  const parts = [event.data.first_name, event.data.last_name]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return parts.length > 0 ? parts.join(" ") : null;
}

async function processContactUpdatedEvent(options: {
  env: EnvSource;
  event: Extract<ResendWebhookPayload, { type: "contact.updated" }>;
  providerEventId: string;
  resend: Pick<ResendWebhookClient, "contacts">;
  supabase: ServiceRoleLike;
}) {
  const email = options.event.data.email.trim().toLowerCase();
  const occurredAt =
    getProviderCreatedAt(options.event) ?? options.event.data.updated_at;

  if (options.event.data.unsubscribed) {
    const contact = await applyProviderAudiencePreferences({
      booksOptIn: false,
      dedupePrefix: `resend-webhook:${options.providerEventId}:global-unsubscribe`,
      email,
      fullName: getContactUpdatedFullName(options.event),
      generalUpdatesOptIn: false,
      lessonsOptIn: false,
      occurredAt,
      supabase: options.supabase,
    });

    await ensureAudienceSuppression({
      contact,
      metadata: {
        event_type: options.event.type,
        provider_contact_id: options.event.data.id,
      },
      occurredAt,
      providerEventId: options.providerEventId,
      reason: "provider_unsubscribe",
      supabase: options.supabase,
    });

    return { status: "processed" as const };
  }

  const localContact = await loadAudienceContactByEmail({
    email,
    supabase: options.supabase,
  });
  if (!localContact) {
    return {
      detail: "No local audience contact to restrict.",
      status: "ignored" as const,
    };
  }

  const optedOutTopics = await getProviderTopicOptOuts({
    contactId: options.event.data.id,
    env: options.env,
    resend: options.resend,
  });
  if (optedOutTopics.length === 0) {
    return {
      detail: "No restrictive Topic changes to apply.",
      status: "ignored" as const,
    };
  }

  const nextPreferences = {
    booksOptIn: localContact.books_opt_in,
    generalUpdatesOptIn: localContact.general_updates_opt_in,
    lessonsOptIn: localContact.lessons_opt_in,
  };

  for (const topic of optedOutTopics) {
    if (topic === "books") {
      nextPreferences.booksOptIn = false;
    } else if (topic === "general_updates") {
      nextPreferences.generalUpdatesOptIn = false;
    } else if (topic === "lessons") {
      nextPreferences.lessonsOptIn = false;
    }
  }

  await applyProviderAudiencePreferences({
    ...nextPreferences,
    dedupePrefix: `resend-webhook:${options.providerEventId}:topic-opt-out`,
    email,
    fullName: localContact.full_name,
    locale: localContact.locale,
    occurredAt,
    supabase: options.supabase,
  });

  return { status: "processed" as const };
}

async function processResendWebhookEvent(options: {
  env: EnvSource;
  event: ResendWebhookPayload;
  providerEventId: string;
  resend: Pick<ResendWebhookClient, "contacts">;
  supabase: ServiceRoleLike;
}): Promise<ResendWebhookProcessingOutcome> {
  if (!RESEND_SUPPORTED_WEBHOOK_EVENTS.has(options.event.type)) {
    return { detail: "Unsupported Resend event type.", status: "ignored" };
  }

  if (options.event.type === "contact.updated") {
    return processContactUpdatedEvent({
      env: options.env,
      event: options.event,
      providerEventId: options.providerEventId,
      resend: options.resend,
      supabase: options.supabase,
    });
  }

  return processEmailEvent({
    event: options.event,
    providerEventId: options.providerEventId,
    supabase: options.supabase,
  });
}

/**
 * Verifies, captures, and optionally processes one Resend webhook delivery.
 * Side effects are disabled unless RESEND_WEBHOOK_PROCESSING_ENABLED=true.
 */
export async function handleResendWebhookRequest(
  request: Request,
  dependencies: HandlerDependencies = {},
) {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed.", success: false });
  }

  const env = dependencies.env ?? process.env;
  const webhookSecret = getWebhookSecret(env);
  if (!webhookSecret) {
    return jsonResponse(503, {
      error: "Resend webhook processing is not configured.",
      success: false,
    });
  }

  const headers = getSvixHeaders(request);
  if (!headers) {
    return jsonResponse(400, {
      error: "Missing Resend webhook signature headers.",
      success: false,
    });
  }

  const resend = (dependencies.createResend?.(getResendApiKey(env)) ??
    new Resend(getResendApiKey(env))) as ResendWebhookClient;
  const rawPayload = await request.text();
  let event: ResendWebhookPayload;

  try {
    event = resend.webhooks.verify({
      headers,
      payload: rawPayload,
      webhookSecret,
    }) as ResendWebhookPayload;
  } catch (error) {
    console.warn("Rejected invalid Resend webhook signature.", error);
    return jsonResponse(400, { error: "Invalid webhook.", success: false });
  }

  const supabase = (dependencies.createSupabase?.() ??
    createServiceRoleClient()) as ServiceRoleLike;
  let storedEvent: StoredWebhookEvent;

  try {
    storedEvent = await recordProviderWebhookEvent({
      event,
      providerEventId: headers.id,
      supabase,
    });
  } catch (error) {
    console.error("Failed to store Resend webhook event.", error);
    return jsonResponse(500, {
      error: "Could not store webhook event.",
      success: false,
    });
  }

  if (storedEvent.duplicate) {
    return jsonResponse(200, {
      duplicate: true,
      success: true,
    });
  }

  if (!readBooleanEnv(env, "RESEND_WEBHOOK_PROCESSING_ENABLED", false)) {
    return jsonResponse(202, {
      captured: true,
      processingEnabled: false,
      success: true,
    });
  }

  try {
    const outcome = await processResendWebhookEvent({
      env,
      event,
      providerEventId: headers.id,
      resend,
      supabase,
    });

    await markProviderWebhookEvent({
      error: outcome.detail ?? null,
      id: storedEvent.id,
      status: outcome.status,
      supabase,
    });

    return jsonResponse(200, {
      processed: outcome.status === "processed",
      success: true,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Webhook processing failed.";
    console.error("Failed to process Resend webhook event.", {
      email:
        "data" in event && "email" in event.data
          ? redactEmailAddress(String(event.data.email))
          : null,
      error,
      type: event.type,
    });

    await markProviderWebhookEvent({
      error: errorMessage,
      id: storedEvent.id,
      status: "failed",
      supabase,
    });

    return jsonResponse(200, {
      error: "Webhook captured but processing failed.",
      success: true,
    });
  }
}
