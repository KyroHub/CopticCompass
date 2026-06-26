import {
  insertNotificationDelivery,
  insertNotificationEvent,
  updateNotificationEventStatus,
} from "./notifications.ts";
import {
  countAudienceContacts,
  finalizeRelease,
  loadReleaseItems,
} from "./supabaseRest.ts";
import {
  buildContentReleaseEmailHtml,
  buildContentReleaseEmailText,
  buildContentReleaseNotificationDedupeKey,
  getContentReleaseBroadcastDeliveries,
  getContentReleaseCopyForLocale,
  getContentReleaseDeliverySummary,
  type ContentReleaseBroadcastDelivery,
  type ContentReleaseDeliverySummary,
  type ContentReleaseItemRecord,
  type ContentReleaseRecord,
  type Language,
} from "../_shared/contentReleaseDelivery.ts";

import type { ResendBroadcastEnv } from "./config.ts";

type ReleaseBroadcastTarget = {
  html: string;
  language: Language;
  recipientCount: number;
  segmentId: string;
  subject: string;
  text: string;
  topicId: string;
};

type ReleaseBroadcastCopy = ReturnType<
  typeof getContentReleaseCopyForLocale
> & {
  body: string;
  subject: string;
};

type BroadcastDeliveryOptions = {
  broadcastEnv: ResendBroadcastEnv;
  notificationFromEmail: string;
  release: ContentReleaseRecord;
  serviceRoleKey: string;
  supabaseUrl: string;
};

type BroadcastTargetResult =
  | { status: "failed"; error: string }
  | { status: "sent"; broadcast: ContentReleaseBroadcastDelivery }
  | { status: "skipped" };

function buildReleaseBroadcastTarget(options: {
  copy: ReleaseBroadcastCopy;
  language: Language;
  recipientCount: number;
  releaseItems: ContentReleaseItemRecord[];
  segmentId: string;
  topicId: string;
}): ReleaseBroadcastTarget {
  return {
    html: buildContentReleaseEmailHtml({
      body: options.copy.body,
      includeMarketingFooter: true,
      items: options.releaseItems,
      language: options.language,
      subject: options.copy.subject,
    }),
    language: options.language,
    recipientCount: options.recipientCount,
    segmentId: options.segmentId,
    subject: options.copy.subject,
    text: buildContentReleaseEmailText({
      body: options.copy.body,
      includeMarketingFooter: true,
      items: options.releaseItems,
      language: options.language,
    }),
    topicId: options.topicId,
  };
}

/**
 * Creates and immediately sends a Resend broadcast for one managed segment.
 * The returned broadcast id is recorded as the provider delivery identifier.
 */
async function createResendBroadcast(options: {
  from: string;
  html?: string;
  name: string;
  resendApiKey: string;
  segmentId: string;
  subject: string;
  text: string;
  topicId: string;
}) {
  const response = await fetch("https://api.resend.com/broadcasts", {
    body: JSON.stringify({
      from: options.from,
      ...(options.html ? { html: options.html } : {}),
      name: options.name,
      segment_id: options.segmentId,
      send: true,
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
}

function getBroadcastTopicId(
  audienceSegment: ContentReleaseRecord["audience_segment"],
  env: ResendBroadcastEnv,
) {
  switch (audienceSegment) {
    case "lessons":
      return env.topics.lessons;
    case "books":
      return env.topics.books;
    case "general":
      return env.topics.general;
    default:
      return null;
  }
}

function getBroadcastBaseSegmentId(
  audienceSegment: ContentReleaseRecord["audience_segment"],
  env: ResendBroadcastEnv,
) {
  switch (audienceSegment) {
    case "lessons":
      return env.segments.lessons;
    case "books":
      return env.segments.books;
    case "general":
      return env.segments.general;
    default:
      return null;
  }
}

function getLocalizedBroadcastSegmentId(
  audienceSegment: ContentReleaseRecord["audience_segment"],
  language: Language,
  env: ResendBroadcastEnv,
) {
  switch (audienceSegment) {
    case "lessons":
      return env.localizedSegments.lessons[language];
    case "books":
      return env.localizedSegments.books[language];
    case "general":
      return env.localizedSegments.general[language];
    default:
      return null;
  }
}

async function buildReleaseBroadcastTargets(options: {
  broadcastEnv: ResendBroadcastEnv;
  release: ContentReleaseRecord;
  releaseItems: ContentReleaseItemRecord[];
  serviceRoleKey: string;
  supabaseUrl: string;
}) {
  if (options.release.locale_mode === "localized") {
    return buildLocalizedReleaseBroadcastTargets(options);
  }

  return buildSingleLocaleReleaseBroadcastTargets(options);
}

async function countLocalizedContacts(options: {
  audienceSegment: ContentReleaseRecord["audience_segment"];
  serviceRoleKey: string;
  supabaseUrl: string;
}) {
  const englishCount = await countAudienceContacts({
    audienceSegment: options.audienceSegment,
    locale: "en",
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });
  const dutchCount = await countAudienceContacts({
    audienceSegment: options.audienceSegment,
    locale: "nl",
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });
  return { englishCount, dutchCount };
}

function buildMissingLocalizedBroadcastConfigResult(
  totalEligibleRecipients: number,
) {
  return {
    error:
      "Resend Broadcasts require localized Segment IDs and a Topic ID for this release audience.",
    targets: null,
    totalEligibleRecipients,
    usedBroadcasts: true as const,
  };
}

/**
 * Builds the localized broadcast plan. If locale-specific segment ids are not
 * fully configured, this returns a blocking error because marketing releases
 * must fail closed instead of falling back to direct Email API sends.
 */
async function buildLocalizedReleaseBroadcastTargets(options: {
  broadcastEnv: ResendBroadcastEnv;
  release: ContentReleaseRecord;
  releaseItems: ContentReleaseItemRecord[];
  serviceRoleKey: string;
  supabaseUrl: string;
}) {
  const { englishCount, dutchCount } = await countLocalizedContacts({
    audienceSegment: options.release.audience_segment,
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });

  if (englishCount === null || dutchCount === null) {
    return {
      error: "Could not count localized recipients for this release.",
      targets: null,
      totalEligibleRecipients: null,
      usedBroadcasts: false as const,
    };
  }

  const topicId = getBroadcastTopicId(
    options.release.audience_segment,
    options.broadcastEnv,
  );
  if (!topicId) {
    return buildMissingLocalizedBroadcastConfigResult(
      englishCount + dutchCount,
    );
  }

  const targets: ReleaseBroadcastTarget[] = [];
  for (const language of ["en", "nl"] as const) {
    const recipientCount = language === "en" ? englishCount : dutchCount;
    if (recipientCount === 0) {
      continue;
    }

    const segmentId = getLocalizedBroadcastSegmentId(
      options.release.audience_segment,
      language,
      options.broadcastEnv,
    );

    if (!segmentId) {
      return buildMissingLocalizedBroadcastConfigResult(
        englishCount + dutchCount,
      );
    }

    const copy = getContentReleaseCopyForLocale(options.release, language);
    if (!copy.subject || !copy.body) {
      return {
        error:
          "This release is missing localized copy for one or more broadcast audiences.",
        targets: [],
        totalEligibleRecipients: englishCount + dutchCount,
        usedBroadcasts: true as const,
      };
    }

    targets.push(
      buildReleaseBroadcastTarget({
        copy: copy as ReleaseBroadcastCopy,
        language,
        recipientCount,
        releaseItems: options.releaseItems,
        segmentId,
        topicId,
      }),
    );
  }

  return {
    error: null,
    targets,
    totalEligibleRecipients: englishCount + dutchCount,
    usedBroadcasts: true as const,
  };
}

/**
 * Builds a single broadcast target for releases that resolve to one language
 * for the whole audience segment.
 */
async function buildSingleLocaleReleaseBroadcastTargets(options: {
  broadcastEnv: ResendBroadcastEnv;
  release: ContentReleaseRecord;
  releaseItems: ContentReleaseItemRecord[];
  serviceRoleKey: string;
  supabaseUrl: string;
}) {
  const totalEligibleRecipients = await countAudienceContacts({
    audienceSegment: options.release.audience_segment,
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });

  if (totalEligibleRecipients === null) {
    return {
      error: "Could not count subscribed recipients for this release.",
      targets: [],
      totalEligibleRecipients: null,
      usedBroadcasts: true as const,
    };
  }

  const segmentId = getBroadcastBaseSegmentId(
    options.release.audience_segment,
    options.broadcastEnv,
  );
  const topicId = getBroadcastTopicId(
    options.release.audience_segment,
    options.broadcastEnv,
  );

  if (!segmentId || !topicId) {
    return {
      error:
        "Resend Broadcasts require a Segment ID and Topic ID for this release audience.",
      targets: null,
      totalEligibleRecipients,
      usedBroadcasts: true as const,
    };
  }

  const language: Language =
    options.release.locale_mode === "nl_only" ? "nl" : "en";
  const copy = getContentReleaseCopyForLocale(options.release, language);
  if (!copy.subject || !copy.body) {
    return {
      error:
        "This release is missing complete copy for the selected broadcast language.",
      targets: [],
      totalEligibleRecipients,
      usedBroadcasts: true as const,
    };
  }

  return {
    error: null,
    targets: [
      buildReleaseBroadcastTarget({
        copy: copy as ReleaseBroadcastCopy,
        language,
        recipientCount: totalEligibleRecipients,
        releaseItems: options.releaseItems,
        segmentId,
        topicId,
      }),
    ],
    totalEligibleRecipients,
    usedBroadcasts: true as const,
  };
}

function buildBroadcastRecipientLabel(target: ReleaseBroadcastTarget) {
  return `${target.language.toUpperCase()} segment ${target.segmentId}`;
}

function getPersistedBroadcastSummary(options: {
  release: ContentReleaseRecord;
  targets: ReleaseBroadcastTarget[];
}) {
  const previousBroadcasts =
    getContentReleaseBroadcastDeliveries(options.release) ?? {};
  const broadcasts: Partial<Record<Language, ContentReleaseBroadcastDelivery>> =
    {
      ...previousBroadcasts,
    };

  for (const target of options.targets) {
    const existing = previousBroadcasts[target.language];
    if (!existing) {
      continue;
    }

    broadcasts[target.language] = existing;
  }

  return broadcasts;
}

function summarizeBroadcastDelivery(options: {
  broadcasts: Partial<Record<Language, ContentReleaseBroadcastDelivery>>;
  failedRecipientCount: number;
  itemCount: number;
  targetedRecipientCount: number;
}) {
  const sentCount = Object.values(options.broadcasts).reduce(
    (total, broadcast) => total + (broadcast?.recipient_count ?? 0),
    0,
  );

  return {
    broadcasts: options.broadcasts,
    eligible_recipient_count: options.targetedRecipientCount,
    failed_count: options.failedRecipientCount,
    item_count: options.itemCount,
    processed_recipient_count: sentCount,
    remaining_recipient_count: Math.max(
      options.targetedRecipientCount - sentCount,
      0,
    ),
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
    remaining_recipient_count: 0,
    sent_count: 0,
    skipped_count: 0,
  };
}

async function finalizeBroadcastRelease(options: {
  error: string | null;
  releaseId: string;
  serviceRoleKey: string;
  summary: ContentReleaseDeliverySummary;
  supabaseUrl: string;
}) {
  await finalizeRelease({
    cursor: null,
    lastDeliveryError: options.error,
    releaseId: options.releaseId,
    serviceRoleKey: options.serviceRoleKey,
    status: "approved",
    summary: options.summary,
    supabaseUrl: options.supabaseUrl,
  });
}

/**
 * Loads the release items and computes the broadcast plan. When the release
 * cannot continue, this helper finalizes it with the appropriate status and
 * returns a completed result instead of throwing.
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
      summary: buildEmptySummary(),
      supabaseUrl: options.supabaseUrl,
    });
    return { completed: true as const, usedBroadcasts: true as const };
  }

  const targetPlan = await buildReleaseBroadcastTargets({
    broadcastEnv: options.broadcastEnv,
    release: options.release,
    releaseItems,
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
  });

  if (!targetPlan.usedBroadcasts) {
    return { completed: true as const, usedBroadcasts: false as const };
  }

  if (targetPlan.error) {
    await finalizeBroadcastRelease({
      error: targetPlan.error,
      releaseId: options.release.id,
      serviceRoleKey: options.serviceRoleKey,
      summary: getContentReleaseDeliverySummary(options.release),
      supabaseUrl: options.supabaseUrl,
    });
    return { completed: true as const, usedBroadcasts: true as const };
  }

  const targets = targetPlan.targets ?? [];
  const totalEligibleRecipients = targetPlan.totalEligibleRecipients ?? 0;

  if (totalEligibleRecipients === 0 || targets.length === 0) {
    await finalizeBroadcastRelease({
      error: "No subscribed recipients match this release segment yet.",
      releaseId: options.release.id,
      serviceRoleKey: options.serviceRoleKey,
      summary: buildEmptySummary(releaseItems.length, totalEligibleRecipients),
      supabaseUrl: options.supabaseUrl,
    });
    return { completed: true as const, usedBroadcasts: true as const };
  }

  return {
    completed: false as const,
    releaseItems,
    targets,
    totalEligibleRecipients,
    usedBroadcasts: true as const,
  };
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
  recipient: string;
  release: ContentReleaseRecord;
  releaseItems: ContentReleaseItemRecord[];
  serviceRoleKey: string;
  supabaseUrl: string;
  target: ReleaseBroadcastTarget;
}) {
  return insertNotificationEvent({
    aggregateId: options.release.id,
    aggregateType: "content_release",
    dedupeKey: buildContentReleaseNotificationDedupeKey({
      eventType: "content_release_broadcast_sent",
      recipient: options.recipient,
      releaseId: options.release.id,
    }),
    eventType: "content_release_broadcast_sent",
    payload: {
      audience_segment: options.release.audience_segment,
      item_count: options.releaseItems.length,
      locale: options.target.language,
      recipient_count: options.target.recipientCount,
      release_type: options.release.release_type,
      segment_id: options.target.segmentId,
      topic_id: options.target.topicId,
    },
    recipient: options.recipient,
    serviceRoleKey: options.serviceRoleKey,
    subject: options.target.subject,
    supabaseUrl: options.supabaseUrl,
  });
}

/**
 * Sends one broadcast target and records the provider outcome through the same
 * notification event/delivery tables used by the rest of the mail pipeline.
 */
async function deliverBroadcastTarget(options: {
  notificationFromEmail: string;
  release: ContentReleaseRecord;
  releaseItems: ContentReleaseItemRecord[];
  resendApiKey: string;
  serviceRoleKey: string;
  supabaseUrl: string;
  target: ReleaseBroadcastTarget;
}): Promise<BroadcastTargetResult> {
  const recipient = buildBroadcastRecipientLabel(options.target);
  const notificationEvent = await createBroadcastNotificationEvent({
    recipient,
    release: options.release,
    releaseItems: options.releaseItems,
    serviceRoleKey: options.serviceRoleKey,
    supabaseUrl: options.supabaseUrl,
    target: options.target,
  });

  if (!notificationEvent?.eventId) {
    return {
      status: "failed" as const,
      error:
        "A notification event could not be stored for one or more broadcasts.",
    };
  }

  const broadcastResult = await createResendBroadcast({
    from: options.notificationFromEmail,
    html: options.target.html,
    name: `content-release-${options.release.id}-${options.target.language}`,
    resendApiKey: options.resendApiKey,
    segmentId: options.target.segmentId,
    subject: options.target.subject,
    text: options.target.text,
    topicId: options.target.topicId,
  });

  if (!broadcastResult.success || !broadcastResult.id) {
    const errorMessage = broadcastResult.success
      ? "Missing broadcast id."
      : broadcastResult.error;

    await recordBroadcastDeliveryOutcome({
      error: errorMessage,
      eventId: notificationEvent.eventId,
      providerMessageId: null,
      recipient,
      serviceRoleKey: options.serviceRoleKey,
      status: "failed",
      supabaseUrl: options.supabaseUrl,
    });

    return {
      status: "failed" as const,
      error: broadcastResult.success
        ? "Resend did not return a broadcast id."
        : broadcastResult.error,
    };
  }

  await recordBroadcastDeliveryOutcome({
    error: null,
    eventId: notificationEvent.eventId,
    providerMessageId: broadcastResult.id,
    recipient,
    serviceRoleKey: options.serviceRoleKey,
    status: "sent",
    supabaseUrl: options.supabaseUrl,
  });

  return {
    status: "sent" as const,
    broadcast: {
      id: broadcastResult.id,
      recipient_count: options.target.recipientCount,
      segment_id: options.target.segmentId,
      status: "sent",
      subject: options.target.subject,
      topic_id: options.target.topicId,
    },
  };
}

/**
 * Attempts release delivery via Resend broadcasts. Marketing sends fail closed
 * when Segment or Topic configuration is incomplete.
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
    return { usedBroadcasts: deliveryContext.usedBroadcasts };
  }

  const { releaseItems, targets, totalEligibleRecipients } = deliveryContext;

  const broadcasts = getPersistedBroadcastSummary({
    release: options.release,
    targets,
  });
  let failedRecipientCount = 0;
  let firstFailure: string | null = null;

  for (const target of targets) {
    if (broadcasts[target.language]) {
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

    if (targetResult.status === "failed") {
      failedRecipientCount += target.recipientCount;
      firstFailure ??= targetResult.error;
      continue;
    }

    if (targetResult.status === "sent") {
      broadcasts[target.language] = targetResult.broadcast;
    }
  }

  const summary = summarizeBroadcastDelivery({
    broadcasts,
    failedRecipientCount,
    itemCount: releaseItems.length,
    targetedRecipientCount: totalEligibleRecipients,
  });

  await finalizeRelease({
    cursor: null,
    lastDeliveryError: firstFailure,
    releaseId: options.release.id,
    serviceRoleKey: options.serviceRoleKey,
    status: failedRecipientCount > 0 ? "approved" : "sent",
    summary,
    supabaseUrl: options.supabaseUrl,
  });

  return { usedBroadcasts: true as const };
}
