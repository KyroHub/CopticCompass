import {
  insertNotificationDelivery,
  insertNotificationEvent,
  updateNotificationEventStatus,
} from "./notifications.ts";
import {
  finalizeRelease,
  loadReleaseItems,
  loadReleaseTargets,
  updateContentReleaseTarget,
} from "./supabaseRest.ts";
import {
  buildContentReleaseEmailHtml,
  buildContentReleaseEmailText,
  buildContentReleaseNotificationDedupeKey,
  getContentReleaseCopyForLocale,
  type ContentReleaseBroadcastDelivery,
  type ContentReleaseDeliverySummary,
  type ContentReleaseItemRecord,
  type ContentReleaseRecord,
  type ContentReleaseTargetRecord,
} from "../_shared/contentReleaseDelivery.ts";

import type { ResendBroadcastEnv } from "./config.ts";

type BroadcastDeliveryOptions = {
  broadcastEnv: ResendBroadcastEnv;
  notificationFromEmail: string;
  release: ContentReleaseRecord;
  serviceRoleKey: string;
  supabaseUrl: string;
};

type ReleaseBroadcastPayload = {
  html: string;
  name: string;
  recipient: string;
  subject: string;
  text: string;
};

type BroadcastTargetResult =
  | {
      error: string;
      status: "failed";
      target: ContentReleaseTargetRecord;
    }
  | {
      broadcast: ContentReleaseBroadcastDelivery;
      status: "sent";
      target: ContentReleaseTargetRecord;
    };

type DeliverBroadcastTargetOptions = {
  notificationFromEmail: string;
  release: ContentReleaseRecord;
  releaseItems: ContentReleaseItemRecord[];
  resendApiKey: string;
  serviceRoleKey: string;
  supabaseUrl: string;
  target: ContentReleaseTargetRecord;
};

type EnsureBroadcastCreatedResult =
  | {
      broadcastId: string;
      isExisting: boolean;
      target: ContentReleaseTargetRecord;
    }
  | {
      error: string;
      target: ContentReleaseTargetRecord;
    };

type EnsureBroadcastCreatedSuccess = Extract<
  EnsureBroadcastCreatedResult,
  { broadcastId: string }
>;
type EnsureBroadcastCreatedFailure = Extract<
  EnsureBroadcastCreatedResult,
  { error: string }
>;

function getProviderErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function buildBroadcastRecipientLabel(target: ContentReleaseTargetRecord) {
  return `${target.language.toUpperCase()} segment ${target.segment_id}`;
}

function buildReleaseBroadcastPayload(options: {
  release: ContentReleaseRecord;
  releaseItems: ContentReleaseItemRecord[];
  target: ContentReleaseTargetRecord;
}): ReleaseBroadcastPayload | null {
  const copy = getContentReleaseCopyForLocale(
    options.release,
    options.target.language,
  );
  if (!copy.body) {
    return null;
  }

  return {
    html: buildContentReleaseEmailHtml({
      body: copy.body,
      includeMarketingFooter: true,
      items: options.releaseItems,
      language: options.target.language,
      subject: options.target.subject_snapshot,
    }),
    name: `content-release-${options.release.id}-${options.target.language}`,
    recipient: buildBroadcastRecipientLabel(options.target),
    subject: options.target.subject_snapshot,
    text: buildContentReleaseEmailText({
      body: copy.body,
      includeMarketingFooter: true,
      items: options.releaseItems,
      language: options.target.language,
    }),
  };
}

/**
 * Creates a Resend Broadcast draft. Sending happens in a separate API call
 * after the provider id has been persisted on the release target.
 */
async function createResendBroadcast(options: {
  from: string;
  html: string;
  name: string;
  resendApiKey: string;
  segmentId: string;
  subject: string;
  text: string;
  topicId: string;
}) {
  try {
    const response = await fetch("https://api.resend.com/broadcasts", {
      body: JSON.stringify({
        from: options.from,
        html: options.html,
        name: options.name,
        segment_id: options.segmentId,
        send: false,
        subject: options.subject,
        text: options.text,
        topic_id: options.topicId,
      }),
      headers: {
        Authorization: `Bearer ${options.resendApiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (response.ok) {
      const data = (await response.json()) as { id?: string };
      return {
        id: data.id ?? null,
        success: true as const,
      };
    }

    return {
      error: (await response.text()) || "Failed to create Resend broadcast.",
      success: false as const,
    };
  } catch (error) {
    return {
      error: getProviderErrorMessage(
        error,
        "Network error while creating Resend broadcast.",
      ),
      success: false as const,
    };
  }
}

/**
 * Sends an existing Resend Broadcast by id. This keeps retries from creating a
 * second provider Broadcast after the first create call succeeded.
 */
async function sendResendBroadcast(options: {
  broadcastId: string;
  resendApiKey: string;
}) {
  try {
    const response = await fetch(
      `https://api.resend.com/broadcasts/${encodeURIComponent(options.broadcastId)}/send`,
      {
        headers: {
          Authorization: `Bearer ${options.resendApiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );

    if (response.ok) {
      return { success: true as const };
    }

    return {
      error: (await response.text()) || "Failed to send Resend broadcast.",
      success: false as const,
    };
  } catch (error) {
    return {
      error: getProviderErrorMessage(
        error,
        "Network error while sending Resend broadcast.",
      ),
      success: false as const,
    };
  }
}

async function getResendBroadcastStatus(options: {
  broadcastId: string;
  resendApiKey: string;
}) {
  try {
    const response = await fetch(
      `https://api.resend.com/broadcasts/${encodeURIComponent(options.broadcastId)}`,
      {
        headers: {
          Authorization: `Bearer ${options.resendApiKey}`,
          "Content-Type": "application/json",
        },
        method: "GET",
      },
    );

    if (response.ok) {
      const data = (await response.json()) as { status?: string };
      return {
        status: data.status ?? null,
        success: true as const,
      };
    }

    return {
      error: (await response.text()) || "Failed to load Resend broadcast.",
      success: false as const,
    };
  } catch (error) {
    return {
      error: getProviderErrorMessage(
        error,
        "Network error while loading Resend broadcast.",
      ),
      success: false as const,
    };
  }
}

async function updateTargetState(options: {
  payload: Record<string, unknown>;
  serviceRoleKey: string;
  supabaseUrl: string;
  targetId: string;
}) {
  return updateContentReleaseTarget(options);
}

async function recordBroadcastDeliveryOutcome(options: {
  error: string | null;
  eventId: string;
  providerMessageId: string | null;
  recipient: string;
  serviceRoleKey: string;
  status: "failed" | "sent";
  supabaseUrl: string;
}) {
  await insertNotificationDelivery({
    error: options.error,
    eventId: options.eventId,
    providerMessageId: options.providerMessageId,
    recipient: options.recipient,
    serviceRoleKey: options.serviceRoleKey,
    status: options.status,
    supabaseUrl: options.supabaseUrl,
  });
  await updateNotificationEventStatus({
    eventId: options.eventId,
    lastError: options.error,
    serviceRoleKey: options.serviceRoleKey,
    status: options.status,
    supabaseUrl: options.supabaseUrl,
  });
}

async function createBroadcastNotificationEvent(options: {
  payload: ReleaseBroadcastPayload;
  release: ContentReleaseRecord;
  releaseItems: ContentReleaseItemRecord[];
  serviceRoleKey: string;
  supabaseUrl: string;
  target: ContentReleaseTargetRecord;
}) {
  return insertNotificationEvent({
    aggregateId: options.release.id,
    aggregateType: "content_release",
    dedupeKey: buildContentReleaseNotificationDedupeKey({
      eventType: "content_release_broadcast_sent",
      recipient: options.payload.recipient,
      releaseId: options.release.id,
    }),
    eventType: "content_release_broadcast_sent",
    payload: {
      audience_segment: options.release.audience_segment,
      item_count: options.releaseItems.length,
      locale: options.target.language,
      recipient_count: options.target.recipient_count_snapshot,
      release_target_id: options.target.id,
      release_type: options.release.release_type,
      segment_id: options.target.segment_id,
      topic_id: options.target.topic_id,
    },
    recipient: options.payload.recipient,
    serviceRoleKey: options.serviceRoleKey,
    subject: options.payload.subject,
    supabaseUrl: options.supabaseUrl,
  });
}

async function markTargetFailed(options: {
  error: string;
  serviceRoleKey: string;
  supabaseUrl: string;
  target: ContentReleaseTargetRecord;
}) {
  const now = new Date().toISOString();
  await updateTargetState({
    payload: {
      failed_at: now,
      last_error: options.error,
      status: "failed",
    },
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
    targetId: options.target.id,
  });

  return {
    ...options.target,
    failed_at: now,
    last_error: options.error,
    status: "failed" as const,
  };
}

async function ensureBroadcastCreated(options: {
  notificationFromEmail: string;
  payload: ReleaseBroadcastPayload;
  resendApiKey: string;
  serviceRoleKey: string;
  supabaseUrl: string;
  target: ContentReleaseTargetRecord;
}): Promise<EnsureBroadcastCreatedResult> {
  if (options.target.provider_broadcast_id) {
    return {
      broadcastId: options.target.provider_broadcast_id,
      isExisting: true,
      target: options.target,
    };
  }

  const creatingStartedAt = new Date().toISOString();
  const markedCreating = await updateTargetState({
    payload: {
      creating_started_at: creatingStartedAt,
      last_error: null,
      status: "creating",
    },
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
    targetId: options.target.id,
  });
  if (!markedCreating) {
    return {
      error: "Could not mark the release target as creating.",
      target: options.target,
    };
  }

  const createResult = await createResendBroadcast({
    from: options.notificationFromEmail,
    html: options.payload.html,
    name: options.payload.name,
    resendApiKey: options.resendApiKey,
    segmentId: options.target.segment_id,
    subject: options.payload.subject,
    text: options.payload.text,
    topicId: options.target.topic_id,
  });

  if (!createResult.success || !createResult.id) {
    return {
      error: createResult.success
        ? "Resend did not return a broadcast id."
        : createResult.error,
      target: options.target,
    };
  }

  const createdProviderAt = new Date().toISOString();
  const markedCreated = await updateTargetState({
    payload: {
      created_provider_at: createdProviderAt,
      last_error: null,
      provider_broadcast_id: createResult.id,
      status: "created",
    },
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
    targetId: options.target.id,
  });
  if (!markedCreated) {
    return {
      error: "Could not persist the provider broadcast id before sending.",
      target: options.target,
    };
  }

  return {
    broadcastId: createResult.id,
    isExisting: false,
    target: {
      ...options.target,
      created_provider_at: createdProviderAt,
      provider_broadcast_id: createResult.id,
      status: "created" as const,
    },
  };
}

async function prepareBroadcastTargetDelivery(
  options: DeliverBroadcastTargetOptions,
): Promise<
  | {
      eventId: string;
      payload: ReleaseBroadcastPayload;
      status: "ready";
    }
  | {
      result: BroadcastTargetResult;
      status: "failed";
    }
> {
  const payload = buildReleaseBroadcastPayload({
    release: options.release,
    releaseItems: options.releaseItems,
    target: options.target,
  });
  if (!payload) {
    const failedTarget = await markTargetFailed({
      error: "This release is missing complete copy for a broadcast target.",
      serviceRoleKey: options.serviceRoleKey,
      supabaseUrl: options.supabaseUrl,
      target: options.target,
    });
    return {
      result: {
        error: failedTarget.last_error ?? "Missing release copy.",
        status: "failed",
        target: failedTarget,
      },
      status: "failed",
    };
  }

  const notificationEvent = await createBroadcastNotificationEvent({
    payload,
    release: options.release,
    releaseItems: options.releaseItems,
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
    target: options.target,
  });

  const eventId = notificationEvent?.eventId;
  if (!eventId) {
    const failedTarget = await markTargetFailed({
      error:
        "A notification event could not be stored for one or more broadcasts.",
      serviceRoleKey: options.serviceRoleKey,
      supabaseUrl: options.supabaseUrl,
      target: options.target,
    });
    return {
      result: {
        error: failedTarget.last_error ?? "Missing notification event.",
        status: "failed",
        target: failedTarget,
      },
      status: "failed",
    };
  }

  return {
    eventId,
    payload,
    status: "ready",
  };
}

async function recordBroadcastCreateFailure(options: {
  created: EnsureBroadcastCreatedFailure;
  eventId: string;
  payload: ReleaseBroadcastPayload;
  serviceRoleKey: string;
  supabaseUrl: string;
}): Promise<BroadcastTargetResult> {
  await recordBroadcastDeliveryOutcome({
    error: options.created.error,
    eventId: options.eventId,
    providerMessageId: options.created.target.provider_broadcast_id,
    recipient: options.payload.recipient,
    serviceRoleKey: options.serviceRoleKey,
    status: "failed",
    supabaseUrl: options.supabaseUrl,
  });

  const failedTarget = await markTargetFailed({
    error: options.created.error,
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
    target: options.created.target,
  });

  return {
    error: options.created.error,
    status: "failed",
    target: failedTarget,
  };
}

async function markBroadcastTargetSending(options: {
  created: EnsureBroadcastCreatedSuccess;
  serviceRoleKey: string;
  supabaseUrl: string;
}): Promise<
  | {
      result: BroadcastTargetResult;
      status: "failed";
    }
  | {
      sendingStartedAt: string;
      status: "sending";
    }
> {
  const sendingStartedAt = new Date().toISOString();
  const markedSending = await updateTargetState({
    payload: {
      attempt_count: options.created.target.attempt_count + 1,
      last_error: null,
      sending_started_at: sendingStartedAt,
      status: "sending",
    },
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
    targetId: options.created.target.id,
  });
  if (!markedSending) {
    const error = "Could not mark the release target as sending.";
    const failedTarget = await markTargetFailed({
      error,
      serviceRoleKey: options.serviceRoleKey,
      supabaseUrl: options.supabaseUrl,
      target: options.created.target,
    });
    return {
      result: {
        error,
        status: "failed",
        target: failedTarget,
      },
      status: "failed",
    };
  }

  return {
    sendingStartedAt,
    status: "sending",
  };
}

async function recordBroadcastSendFailure(options: {
  created: EnsureBroadcastCreatedSuccess;
  error: string;
  eventId: string;
  payload: ReleaseBroadcastPayload;
  sendingStartedAt: string;
  serviceRoleKey: string;
  supabaseUrl: string;
}): Promise<BroadcastTargetResult> {
  await recordBroadcastDeliveryOutcome({
    error: options.error,
    eventId: options.eventId,
    providerMessageId: options.created.broadcastId,
    recipient: options.payload.recipient,
    serviceRoleKey: options.serviceRoleKey,
    status: "failed",
    supabaseUrl: options.supabaseUrl,
  });

  const failedTarget = await markTargetFailed({
    error: options.error,
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
    target: {
      ...options.created.target,
      attempt_count: options.created.target.attempt_count + 1,
      sending_started_at: options.sendingStartedAt,
      status: "sending",
    },
  });

  return {
    error: options.error,
    status: "failed",
    target: failedTarget,
  };
}

async function recordAcceptedBroadcastSend(options: {
  created: EnsureBroadcastCreatedSuccess;
  eventId: string;
  payload: ReleaseBroadcastPayload;
  sendingStartedAt: string;
  serviceRoleKey: string;
  supabaseUrl: string;
}): Promise<BroadcastTargetResult> {
  await recordBroadcastDeliveryOutcome({
    error: null,
    eventId: options.eventId,
    providerMessageId: options.created.broadcastId,
    recipient: options.payload.recipient,
    serviceRoleKey: options.serviceRoleKey,
    status: "sent",
    supabaseUrl: options.supabaseUrl,
  });

  const acceptedAt = new Date().toISOString();
  await updateTargetState({
    payload: {
      accepted_at: acceptedAt,
      last_error: null,
      status: "accepted",
    },
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
    targetId: options.created.target.id,
  });

  const acceptedTarget = {
    ...options.created.target,
    accepted_at: acceptedAt,
    attempt_count: options.created.target.attempt_count + 1,
    last_error: null,
    sending_started_at: options.sendingStartedAt,
    status: "accepted" as const,
  };

  return {
    broadcast: {
      id: options.created.broadcastId,
      recipient_count: acceptedTarget.recipient_count_snapshot,
      segment_id: acceptedTarget.segment_id,
      status: "sent",
      subject: acceptedTarget.subject_snapshot,
      topic_id: acceptedTarget.topic_id,
    },
    status: "sent",
    target: acceptedTarget,
  };
}

async function recoverExistingBroadcastTarget(options: {
  created: EnsureBroadcastCreatedSuccess;
  eventId: string;
  payload: ReleaseBroadcastPayload;
  resendApiKey: string;
  serviceRoleKey: string;
  supabaseUrl: string;
}): Promise<BroadcastTargetResult | null> {
  if (!options.created.isExisting) {
    return null;
  }

  const providerBroadcast = await getResendBroadcastStatus({
    broadcastId: options.created.broadcastId,
    resendApiKey: options.resendApiKey,
  });

  if (!providerBroadcast.success) {
    return recordBroadcastSendFailure({
      created: options.created,
      error: providerBroadcast.error,
      eventId: options.eventId,
      payload: options.payload,
      sendingStartedAt: new Date().toISOString(),
      serviceRoleKey: options.serviceRoleKey,
      supabaseUrl: options.supabaseUrl,
    });
  }

  if (
    providerBroadcast.status === "queued" ||
    providerBroadcast.status === "sent"
  ) {
    return recordAcceptedBroadcastSend({
      created: options.created,
      eventId: options.eventId,
      payload: options.payload,
      sendingStartedAt: new Date().toISOString(),
      serviceRoleKey: options.serviceRoleKey,
      supabaseUrl: options.supabaseUrl,
    });
  }

  if (providerBroadcast.status === "draft") {
    return null;
  }

  return recordBroadcastSendFailure({
    created: options.created,
    error: `Existing Resend broadcast has unsupported status: ${providerBroadcast.status ?? "unknown"}.`,
    eventId: options.eventId,
    payload: options.payload,
    sendingStartedAt: new Date().toISOString(),
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });
}

/**
 * Sends one persisted broadcast target. Provider creation and provider sending
 * are split so retries can resume from a saved Broadcast id.
 */
async function deliverBroadcastTarget(
  options: DeliverBroadcastTargetOptions,
): Promise<BroadcastTargetResult> {
  const prepared = await prepareBroadcastTargetDelivery(options);
  if (prepared.status === "failed") {
    return prepared.result;
  }

  const created = await ensureBroadcastCreated({
    notificationFromEmail: options.notificationFromEmail,
    payload: prepared.payload,
    resendApiKey: options.resendApiKey,
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
    target: options.target,
  });
  if ("error" in created) {
    return recordBroadcastCreateFailure({
      created,
      eventId: prepared.eventId,
      payload: prepared.payload,
      serviceRoleKey: options.serviceRoleKey,
      supabaseUrl: options.supabaseUrl,
    });
  }

  const recovered = await recoverExistingBroadcastTarget({
    created,
    eventId: prepared.eventId,
    payload: prepared.payload,
    resendApiKey: options.resendApiKey,
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });
  if (recovered) {
    return recovered;
  }

  const sending = await markBroadcastTargetSending({
    created,
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });
  if (sending.status === "failed") {
    return sending.result;
  }

  const sendResult = await sendResendBroadcast({
    broadcastId: created.broadcastId,
    resendApiKey: options.resendApiKey,
  });
  if (!sendResult.success) {
    return recordBroadcastSendFailure({
      created,
      error: sendResult.error,
      eventId: prepared.eventId,
      payload: prepared.payload,
      sendingStartedAt: sending.sendingStartedAt,
      serviceRoleKey: options.serviceRoleKey,
      supabaseUrl: options.supabaseUrl,
    });
  }

  return recordAcceptedBroadcastSend({
    created,
    eventId: prepared.eventId,
    payload: prepared.payload,
    sendingStartedAt: sending.sendingStartedAt,
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });
}

function summarizeBroadcastTargets(options: {
  itemCount: number;
  targets: ContentReleaseTargetRecord[];
}) {
  const broadcasts: Partial<
    Record<"en" | "nl", ContentReleaseBroadcastDelivery>
  > = {};
  let failedCount = 0;
  let sentCount = 0;
  let totalCount = 0;

  for (const target of options.targets) {
    totalCount += target.recipient_count_snapshot;

    if (target.status === "accepted" && target.provider_broadcast_id) {
      sentCount += target.recipient_count_snapshot;
      broadcasts[target.language] = {
        id: target.provider_broadcast_id,
        recipient_count: target.recipient_count_snapshot,
        segment_id: target.segment_id,
        status: "sent",
        subject: target.subject_snapshot,
        topic_id: target.topic_id,
      };
      continue;
    }

    if (target.status === "failed") {
      failedCount += target.recipient_count_snapshot;
    }
  }

  return {
    broadcasts,
    eligible_recipient_count: totalCount,
    failed_count: failedCount,
    item_count: options.itemCount,
    processed_recipient_count: sentCount + failedCount,
    remaining_recipient_count: Math.max(totalCount - sentCount, 0),
    sent_count: sentCount,
    skipped_count: 0,
  } satisfies ContentReleaseDeliverySummary;
}

function buildEmptySummary(
  itemCount: number = 0,
  eligibleRecipientCount: number = 0,
): ContentReleaseDeliverySummary {
  return {
    eligible_recipient_count: eligibleRecipientCount,
    failed_count: 0,
    item_count: itemCount,
    processed_recipient_count: 0,
    remaining_recipient_count: eligibleRecipientCount,
    sent_count: 0,
    skipped_count: 0,
  };
}

async function finalizeBroadcastRelease(options: {
  error: string | null;
  releaseId: string;
  serviceRoleKey: string;
  status: ContentReleaseRecord["status"];
  summary: ContentReleaseDeliverySummary;
  supabaseUrl: string;
}) {
  await finalizeRelease({
    cursor: null,
    lastDeliveryError: options.error,
    releaseId: options.releaseId,
    serviceRoleKey: options.serviceRoleKey,
    status: options.status,
    summary: options.summary,
    supabaseUrl: options.supabaseUrl,
  });
}

/**
 * Loads release items and durable targets. Missing targets indicate an older or
 * malformed queue attempt, so the release is returned to approved for review.
 */
async function prepareBroadcastDeliveryContext(
  options: BroadcastDeliveryOptions,
) {
  const releaseItems = await loadReleaseItems({
    releaseId: options.release.id,
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });

  if (!releaseItems || releaseItems.length === 0) {
    await finalizeBroadcastRelease({
      error: "This release has no snapshotted items to send yet.",
      releaseId: options.release.id,
      serviceRoleKey: options.serviceRoleKey,
      status: "approved",
      summary: buildEmptySummary(),
      supabaseUrl: options.supabaseUrl,
    });
    return { completed: true as const };
  }

  const targets = await loadReleaseTargets({
    releaseId: options.release.id,
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });

  if (!targets || targets.length === 0) {
    await finalizeBroadcastRelease({
      error: "This release has no durable delivery targets to process.",
      releaseId: options.release.id,
      serviceRoleKey: options.serviceRoleKey,
      status: "approved",
      summary: buildEmptySummary(releaseItems.length),
      supabaseUrl: options.supabaseUrl,
    });
    return { completed: true as const };
  }

  return {
    completed: false as const,
    releaseItems,
    targets,
  };
}

function replaceTarget(
  targets: ContentReleaseTargetRecord[],
  replacement: ContentReleaseTargetRecord,
) {
  return targets.map((target) =>
    target.id === replacement.id ? replacement : target,
  );
}

/**
 * Attempts release delivery via persisted Resend Broadcast targets. Marketing
 * sends never fall back to direct Email API sends.
 */
export async function deliverReleaseByBroadcast(options: {
  broadcastEnv: ResendBroadcastEnv;
  notificationFromEmail: string;
  release: ContentReleaseRecord;
  serviceRoleKey: string;
  supabaseUrl: string;
}) {
  const deliveryContext = await prepareBroadcastDeliveryContext(options);
  if (deliveryContext.completed) {
    return { usedBroadcasts: true as const };
  }

  const { releaseItems } = deliveryContext;
  let targets = deliveryContext.targets;
  let firstFailure: string | null = null;

  for (const target of targets) {
    if (target.status === "accepted") {
      continue;
    }

    const targetResult = await deliverBroadcastTarget({
      notificationFromEmail: options.notificationFromEmail,
      release: options.release,
      releaseItems,
      resendApiKey: options.broadcastEnv.resendApiKey,
      serviceRoleKey: options.serviceRoleKey,
      supabaseUrl: options.supabaseUrl,
      target,
    });

    targets = replaceTarget(targets, targetResult.target);

    if (targetResult.status === "failed") {
      firstFailure ??= targetResult.error;
    }
  }

  const summary = summarizeBroadcastTargets({
    itemCount: releaseItems.length,
    targets,
  });
  const failedRecipientCount = summary.failed_count;

  await finalizeRelease({
    cursor: null,
    lastDeliveryError: firstFailure,
    releaseId: options.release.id,
    serviceRoleKey: options.serviceRoleKey,
    status: failedRecipientCount > 0 ? "partially_failed" : "sent",
    summary,
    supabaseUrl: options.supabaseUrl,
  });

  return { usedBroadcasts: true as const };
}
