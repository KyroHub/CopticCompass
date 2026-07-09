"use server";

import { getContentReleaseCandidateMap } from "@/features/communications/lib/releaseCandidates";
import {
  type ContentReleaseRow,
  buildContentReleaseEmailHtml,
  buildContentReleaseEmailText,
  deriveContentReleaseType,
  getContentReleaseCopyForLocale,
  isContentReleaseAudienceSegment,
  isContentReleaseDeletableStatus,
  isContentReleaseEditableStatus,
  isContentReleaseLocaleMode,
} from "@/features/communications/lib/releases";
import {
  getContentReleaseBroadcastConfigurationError,
  getContentReleaseBroadcastTargetConfig,
} from "@/features/communications/lib/server/resend";
import { getNotificationEmailEnv } from "@/lib/notifications/config";
import { dispatchLoggedNotificationEmail } from "@/lib/notifications/events";
import { revalidateAdminPaths } from "@/lib/server/revalidation";
import { invokeSupabaseEdgeFunction } from "@/lib/supabase/functions";
import {
  getFormString,
  hasLengthInRange,
  isUuid,
  normalizeMultiline,
  normalizeWhitespace,
} from "@/lib/validation";
import type { Language } from "@/types/i18n";

import {
  type ContentReleaseDeliveryTargetInput,
  countContentReleaseAudienceContacts,
  createContentReleaseItemSnapshots,
  createContentReleaseRecord,
  deleteContentReleaseRecord,
  loadContentReleaseForDelivery,
  loadContentReleaseStatusRecord,
  queueContentReleaseDeliveryRecord,
  revertQueuedContentReleaseRecord,
  updateContentReleaseStatusRecord,
} from "./releasePersistence";
import { getValidatedAdminContext, type AdminSupabase } from "./shared";

import type {
  ContentReleaseDraftState,
  DeleteContentReleaseState,
  SendContentReleaseState,
} from "./states";

type ParsedContentReleaseDraft = {
  audienceSegment: ContentReleaseRow["audience_segment"];
  bodyEn: string;
  bodyNl: string;
  localeMode: ContentReleaseRow["locale_mode"];
  releaseType: NonNullable<ReturnType<typeof deriveContentReleaseType>>;
  resolvedItems: ReturnType<typeof getContentReleaseCandidateMap> extends Map<
    string,
    infer Candidate
  >
    ? Candidate[]
    : never;
  subjectEn: string;
  subjectNl: string;
};

const RELEASE_COPY_VALIDATION_ERROR =
  "Provide the required localized subject and message copy for this release.";
const RELEASE_ZERO_RECIPIENTS_MESSAGE =
  "No subscribed recipients match this release segment yet.";
const RELEASE_TARGET_COUNT_ERROR =
  "Could not count subscribed recipients for this release.";

/**
 * Reads the checked release-item ids from form data and returns them in the
 * normalized order expected by the admin release workflow.
 */
function getSelectedReleaseItems(formData: FormData) {
  return formData
    .getAll("release_item")
    .filter((value): value is string => typeof value === "string")
    .map((value) => normalizeWhitespace(value))
    .filter((value) => value.length > 0);
}

/**
 * Resolves the submitted item ids against the current release-candidate map so
 * draft creation stores stable snapshots instead of raw form values.
 */
function getResolvedReleaseItems(selectedItems: string[]) {
  const candidateMap = getContentReleaseCandidateMap();

  return selectedItems
    .map((selectedItem) => candidateMap.get(selectedItem) ?? null)
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

type ReleaseCopyFieldValidation = {
  max: number;
  value: string;
};

/**
 * Returns the localized copy fields that are required for the selected locale
 * mode so validation can stay data-driven instead of branching per field.
 */
function getRequiredReleaseCopyFields(options: {
  bodyEn: string;
  bodyNl: string;
  localeMode: string;
  subjectEn: string;
  subjectNl: string;
}): ReleaseCopyFieldValidation[] {
  const requiredFields: ReleaseCopyFieldValidation[] = [];

  if (options.localeMode === "localized" || options.localeMode === "en_only") {
    requiredFields.push(
      { max: 160, value: options.subjectEn },
      { max: 8000, value: options.bodyEn },
    );
  }

  if (options.localeMode === "localized" || options.localeMode === "nl_only") {
    requiredFields.push(
      { max: 160, value: options.subjectNl },
      { max: 8000, value: options.bodyNl },
    );
  }

  return requiredFields;
}

/**
 * Validates that the localized subject/body fields required by the chosen
 * locale mode are present and within the supported length limits.
 */
function getReleaseCopyValidationError(options: {
  bodyEn: string;
  bodyNl: string;
  localeMode: string;
  subjectEn: string;
  subjectNl: string;
}) {
  return getRequiredReleaseCopyFields(options).every((field) =>
    hasLengthInRange(field.value, { min: 1, max: field.max }),
  )
    ? null
    : RELEASE_COPY_VALIDATION_ERROR;
}

/**
 * Validates the release draft form and resolves the selected content items
 * into the typed shape used by draft persistence and preview delivery.
 */
function parseContentReleaseDraft(
  formData: FormData,
): { error: string } | { values: ParsedContentReleaseDraft } {
  const audienceSegment = normalizeWhitespace(
    getFormString(formData, "audience_segment"),
  );
  const localeMode = normalizeWhitespace(
    getFormString(formData, "locale_mode"),
  );
  const subjectEn = normalizeWhitespace(getFormString(formData, "subject_en"));
  const subjectNl = normalizeWhitespace(getFormString(formData, "subject_nl"));
  const bodyEn = normalizeMultiline(getFormString(formData, "body_en"));
  const bodyNl = normalizeMultiline(getFormString(formData, "body_nl"));
  const selectedItems = getSelectedReleaseItems(formData);

  if (
    !isContentReleaseAudienceSegment(audienceSegment) ||
    !isContentReleaseLocaleMode(localeMode)
  ) {
    return {
      error: "Choose a valid audience segment and locale mode.",
    };
  }

  if (selectedItems.length === 0) {
    return {
      error: "Select at least one lesson or publication for this release.",
    };
  }

  const resolvedItems = getResolvedReleaseItems(selectedItems);

  if (resolvedItems.length !== selectedItems.length) {
    return {
      error: "One or more selected release items could not be found.",
    };
  }

  const releaseType = deriveContentReleaseType(
    resolvedItems.map((item) => item.itemType),
  );

  if (!releaseType) {
    return {
      error: "Could not determine the release type from the selected items.",
    };
  }

  const copyValidationError = getReleaseCopyValidationError({
    bodyEn,
    bodyNl,
    localeMode,
    subjectEn,
    subjectNl,
  });
  if (copyValidationError) {
    return {
      error: copyValidationError,
    };
  }

  return {
    values: {
      audienceSegment,
      bodyEn,
      bodyNl,
      localeMode,
      releaseType,
      resolvedItems,
      subjectEn,
      subjectNl,
    },
  };
}

/**
 * Creates a release draft row plus immutable item snapshots so later previews
 * and deliveries operate on the reviewed draft content rather than live pages.
 */
export async function createContentReleaseDraft(
  _prevState: ContentReleaseDraftState | null,
  formData: FormData,
): Promise<ContentReleaseDraftState> {
  const adminContext = await getValidatedAdminContext();
  if (!adminContext) {
    return {
      success: false,
      error: "Release drafts are unavailable right now.",
    };
  }

  const { supabase } = adminContext;
  const parseResult = parseContentReleaseDraft(formData);

  if ("error" in parseResult) {
    return {
      success: false,
      error: parseResult.error,
    };
  }
  const {
    audienceSegment,
    bodyEn,
    bodyNl,
    localeMode,
    releaseType,
    resolvedItems,
    subjectEn,
    subjectNl,
  } = parseResult.values;

  const { data: release, error: releaseError } =
    await createContentReleaseRecord({
      audienceSegment,
      bodyEn: bodyEn || null,
      bodyNl: bodyNl || null,
      localeMode,
      releaseType,
      subjectEn: subjectEn || null,
      subjectNl: subjectNl || null,
      supabase,
    });

  if (releaseError || !release) {
    console.error("Error creating content release draft:", releaseError);
    return {
      success: false,
      error: "Could not create the content release draft.",
    };
  }

  const { error: itemsError } = await createContentReleaseItemSnapshots({
    releaseId: release.id,
    resolvedItems,
    supabase,
  });

  if (itemsError) {
    console.error("Error storing content release draft items:", itemsError);
    return {
      success: false,
      error:
        "The release draft was created, but its content items could not be stored cleanly.",
    };
  }

  revalidateAdminPaths();
  return { success: true };
}

/**
 * Applies an admin review decision to a release that is still editable.
 * Invalid payloads are rejected quietly because this action is driven by form
 * posts rather than direct user-visible mutation feedback.
 */
export async function updateContentReleaseStatus(
  formData: FormData,
): Promise<void> {
  const adminContext = await getValidatedAdminContext();
  if (!adminContext) {
    console.warn(
      "Content release review skipped because Supabase is not configured.",
    );
    return;
  }

  const { supabase, user } = adminContext;
  const releaseId = normalizeWhitespace(getFormString(formData, "release_id"));
  const status = normalizeWhitespace(getFormString(formData, "status"));

  if (!isUuid(releaseId) || !isContentReleaseEditableStatus(status)) {
    console.warn("Rejected invalid content release review payload", {
      releaseId,
      status,
      userId: user.id,
    });
    return;
  }

  const { error } = await updateContentReleaseStatusRecord({
    releaseId,
    status,
    supabase,
  });

  if (error) {
    console.error("Error updating content release status:", error);
  }

  revalidateAdminPaths();
}

/**
 * Deletes a release only when it is still safe to remove from history.
 * Sent or in-flight releases stay preserved so delivery auditing remains
 * accurate.
 */
export async function deleteContentReleaseDraft(
  _prevState: DeleteContentReleaseState | null,
  formData: FormData,
): Promise<DeleteContentReleaseState> {
  const adminContext = await getValidatedAdminContext();
  if (!adminContext) {
    return {
      success: false,
      message: "Draft cleanup is unavailable right now.",
    };
  }

  const { supabase, user } = adminContext;
  const releaseId = normalizeWhitespace(getFormString(formData, "release_id"));

  if (!isUuid(releaseId)) {
    console.warn("Rejected invalid content release deletion payload", {
      releaseId,
      userId: user.id,
    });
    return {
      success: false,
      message: "Choose a valid draft before deleting it.",
    };
  }

  const { data: release, error: releaseError } =
    await loadContentReleaseStatusRecord({
      releaseId,
      supabase,
    });

  if (releaseError || !release) {
    console.error("Error loading content release draft for deletion:", {
      releaseError,
      releaseId,
      userId: user.id,
    });
    return {
      success: false,
      message: "Could not load that release draft.",
    };
  }

  if (!isContentReleaseDeletableStatus(release.status)) {
    return {
      success: false,
      message:
        "Only draft or cancelled releases can be deleted. Sent and in-flight releases stay in history.",
    };
  }

  const { data: deletedRelease, error: deleteError } =
    await deleteContentReleaseRecord({
      releaseId,
      supabase,
    });

  if (deleteError) {
    console.error("Error deleting content release draft:", {
      deleteError,
      releaseId,
      userId: user.id,
    });
    return {
      success: false,
      message: "Could not delete this release draft.",
    };
  }

  if (!deletedRelease) {
    console.error("No content release draft was deleted.", {
      releaseId,
      userId: user.id,
    });
    return {
      success: false,
      message:
        "This draft could not be deleted yet. Make sure the latest content release permissions migration has been applied.",
    };
  }

  revalidateAdminPaths();
  return {
    success: true,
    message: "Release draft deleted.",
  };
}

/**
 * Returns the blocking message for a release that cannot transition into the
 * queued delivery state yet.
 */
function getReleaseSendBlockedMessage(
  release: Pick<ContentReleaseRow, "status">,
) {
  if (release.status === "sending") {
    return "This release is already being delivered in the background.";
  }

  if (release.status === "sent") {
    return "This release has already been delivered.";
  }

  if (release.status !== "approved" && release.status !== "partially_failed") {
    return "Approve the release draft before sending it.";
  }

  return null;
}

function getReleaseTargetCopyState(
  release: ContentReleaseRow,
  language: Language,
): { body: string; subject: string } | { message: string } {
  const copy = getContentReleaseCopyForLocale(release, language);
  if (!copy.subject || !copy.body) {
    return {
      message:
        "This release is missing complete copy for one or more target audiences.",
    };
  }

  return {
    body: copy.body,
    subject: copy.subject,
  };
}

async function countReleaseTargetRecipients(options: {
  audienceSegment: ContentReleaseRow["audience_segment"];
  language?: Language;
  supabase: AdminSupabase;
}) {
  const result = await countContentReleaseAudienceContacts({
    audienceSegment: options.audienceSegment,
    ...(options.language ? { locale: options.language } : {}),
    supabase: options.supabase,
  });

  if (result.error || result.count === null) {
    console.error("Could not count content release recipients.", {
      audienceSegment: options.audienceSegment,
      error: result.error,
      language: options.language,
    });
    return null;
  }

  return result.count;
}

async function buildLocalizedReleaseTargetPlan(options: {
  release: ContentReleaseRow;
  supabase: AdminSupabase;
}): Promise<
  | { message: string; success: false }
  | { message: string; success: true }
  | { targets: ContentReleaseDeliveryTargetInput[] }
> {
  const targetConfig = getContentReleaseBroadcastTargetConfig(options.release);
  if (!targetConfig) {
    return {
      message:
        "Resend Broadcast delivery is missing required Segment or Topic configuration.",
      success: false,
    };
  }

  const targets: ContentReleaseDeliveryTargetInput[] = [];
  for (const language of ["en", "nl"] as const) {
    const recipientCount = await countReleaseTargetRecipients({
      audienceSegment: options.release.audience_segment,
      language,
      supabase: options.supabase,
    });
    if (recipientCount === null) {
      return {
        message: RELEASE_TARGET_COUNT_ERROR,
        success: false,
      };
    }

    if (recipientCount === 0) {
      continue;
    }

    const segmentId = targetConfig.segments[language];
    if (!segmentId) {
      return {
        message:
          "Resend Broadcast delivery is missing a localized Segment ID for this release.",
        success: false,
      };
    }

    const copy = getReleaseTargetCopyState(options.release, language);
    if ("message" in copy) {
      return {
        message: copy.message,
        success: false,
      };
    }

    targets.push({
      language,
      recipient_count_snapshot: recipientCount,
      segment_id: segmentId,
      subject_snapshot: copy.subject,
      topic_id: targetConfig.topicId,
    });
  }

  return targets.length === 0
    ? { message: RELEASE_ZERO_RECIPIENTS_MESSAGE, success: true }
    : { targets };
}

async function buildSingleLocaleReleaseTargetPlan(options: {
  release: ContentReleaseRow;
  supabase: AdminSupabase;
}): Promise<
  | { message: string; success: false }
  | { message: string; success: true }
  | { targets: ContentReleaseDeliveryTargetInput[] }
> {
  const targetConfig = getContentReleaseBroadcastTargetConfig(options.release);
  if (!targetConfig) {
    return {
      message:
        "Resend Broadcast delivery is missing required Segment or Topic configuration.",
      success: false,
    };
  }

  const recipientCount = await countReleaseTargetRecipients({
    audienceSegment: options.release.audience_segment,
    supabase: options.supabase,
  });
  if (recipientCount === null) {
    return {
      message: RELEASE_TARGET_COUNT_ERROR,
      success: false,
    };
  }

  if (recipientCount === 0) {
    return {
      message: RELEASE_ZERO_RECIPIENTS_MESSAGE,
      success: true,
    };
  }

  const language: Language =
    options.release.locale_mode === "nl_only" ? "nl" : "en";
  const segmentId = targetConfig.segments[language];
  if (!segmentId) {
    return {
      message:
        "Resend Broadcast delivery is missing a Segment ID for this release.",
      success: false,
    };
  }

  const copy = getReleaseTargetCopyState(options.release, language);
  if ("message" in copy) {
    return {
      message: copy.message,
      success: false,
    };
  }

  return {
    targets: [
      {
        language,
        recipient_count_snapshot: recipientCount,
        segment_id: segmentId,
        subject_snapshot: copy.subject,
        topic_id: targetConfig.topicId,
      },
    ],
  };
}

async function buildReleaseTargetPlan(options: {
  release: ContentReleaseRow;
  supabase: AdminSupabase;
}) {
  return options.release.locale_mode === "localized"
    ? buildLocalizedReleaseTargetPlan(options)
    : buildSingleLocaleReleaseTargetPlan(options);
}

/**
 * Moves an approved release into the queued state before the worker is invoked.
 */
async function queueReleaseForDelivery(options: {
  itemCount: number;
  releaseId: string;
  supabase: AdminSupabase;
  targets: ContentReleaseDeliveryTargetInput[];
}) {
  return queueContentReleaseDeliveryRecord({
    itemCount: options.itemCount,
    releaseId: options.releaseId,
    supabase: options.supabase,
    targets: options.targets,
  });
}

async function queueReleaseForDeliveryIfNeeded(options: {
  isResumingQueuedRelease: boolean;
  release: ContentReleaseRow;
  releaseId: string;
  releaseItems: NonNullable<
    Awaited<ReturnType<typeof loadContentReleaseForDelivery>>
  >["items"];
  supabase: AdminSupabase;
}): Promise<SendContentReleaseState | null> {
  if (options.isResumingQueuedRelease) {
    return null;
  }

  const blockedMessage = getReleaseSendBlockedMessage(options.release);
  if (blockedMessage) {
    return {
      success: false,
      message: blockedMessage,
    };
  }

  const targetPlan = await buildReleaseTargetPlan({
    release: options.release,
    supabase: options.supabase,
  });
  if ("message" in targetPlan) {
    return targetPlan;
  }

  const { error: queueError } = await queueReleaseForDelivery({
    itemCount: options.releaseItems.length,
    releaseId: options.releaseId,
    supabase: options.supabase,
    targets: targetPlan.targets,
  });

  if (queueError) {
    console.error("Error queueing content release delivery:", queueError);
    return {
      success: false,
      message: "Could not queue this release for delivery.",
    };
  }

  return null;
}

/**
 * Reverts the queued state when the background worker could not be started.
 */
async function getReleaseWorkerStartFailureState(options: {
  isResumingQueuedRelease: boolean;
  releaseId: string;
  supabase: AdminSupabase;
}): Promise<SendContentReleaseState> {
  const { error: revertError } = await revertQueuedContentReleaseRecord({
    isResumingQueuedRelease: options.isResumingQueuedRelease,
    releaseId: options.releaseId,
    supabase: options.supabase,
  });

  if (revertError) {
    console.error("Error reverting content release queue state:", revertError);
  }

  revalidateAdminPaths();

  return {
    success: false,
    message: "The background release worker could not be started right now.",
  };
}

function getReleaseBroadcastConfigurationState(
  release: Pick<ContentReleaseRow, "audience_segment" | "locale_mode">,
): SendContentReleaseState | null {
  const message = getContentReleaseBroadcastConfigurationError(release);

  return message ? { message, success: false } : null;
}

function getReleaseSendSuccessMessage(options: {
  isResumingQueuedRelease: boolean;
  release: Pick<ContentReleaseRow, "status">;
}) {
  if (options.isResumingQueuedRelease) {
    return "Queued release resumed. Delivery will continue in the background.";
  }

  if (options.release.status === "partially_failed") {
    return "Release retry queued. Delivery will continue in the background.";
  }

  return "Release queued. Delivery will continue in the background.";
}

/**
 * Queues a reviewed release for background delivery, or resumes an already
 * queued release whose worker chain stalled before completion.
 */
export async function sendContentRelease(
  _prevState: SendContentReleaseState | null,
  formData: FormData,
): Promise<SendContentReleaseState> {
  const adminContext = await getValidatedAdminContext();
  if (!adminContext) {
    return {
      success: false,
      message: "Release sending is unavailable right now.",
    };
  }

  const { supabase } = adminContext;
  const releaseId = normalizeWhitespace(getFormString(formData, "release_id"));

  if (!isUuid(releaseId)) {
    return {
      success: false,
      message: "Choose a valid release draft before sending.",
    };
  }

  const deliveryContext = await loadContentReleaseForDelivery(
    releaseId,
    supabase,
  );
  if (!deliveryContext) {
    return {
      success: false,
      message: "Could not load that release draft.",
    };
  }
  const { items: releaseItems, release } = deliveryContext;
  const isResumingQueuedRelease = release.status === "queued";
  const configurationState = getReleaseBroadcastConfigurationState(release);
  if (configurationState) {
    return configurationState;
  }

  const queueState = await queueReleaseForDeliveryIfNeeded({
    isResumingQueuedRelease,
    release,
    releaseId,
    releaseItems,
    supabase,
  });
  if (queueState) {
    return queueState;
  }

  const invokeResult = await invokeSupabaseEdgeFunction(
    "process-content-release",
    {
      releaseId,
    },
  );

  if (!invokeResult.success) {
    return getReleaseWorkerStartFailureState({
      isResumingQueuedRelease,
      releaseId,
      supabase,
    });
  }

  revalidateAdminPaths();

  return {
    success: true,
    message: getReleaseSendSuccessMessage({
      isResumingQueuedRelease,
      release,
    }),
  };
}

async function dispatchReleasePreviewEmail(options: {
  copy: ReturnType<typeof getContentReleaseCopyForLocale> & {
    subject: string;
    body: string;
  };
  env: NonNullable<ReturnType<typeof getNotificationEmailEnv>> & {
    ownerAlertEmail: string;
  };
  release: ContentReleaseRow;
  releaseId: string;
  releaseItems: NonNullable<
    Awaited<ReturnType<typeof loadContentReleaseForDelivery>>
  >["items"];
}): Promise<SendContentReleaseState> {
  const result = await dispatchLoggedNotificationEmail({
    aggregateId: options.releaseId,
    aggregateType: "content_release",
    eventType: "content_release_test_sent",
    payload: {
      audience_segment: options.release.audience_segment,
      item_count: options.releaseItems.length,
      locale: options.copy.language,
      locale_mode: options.release.locale_mode,
      preview: "true",
      release_type: options.release.release_type,
    },
    subject: `[Coptic Compass Preview] ${options.copy.subject}`,
    html: buildContentReleaseEmailHtml({
      body: options.copy.body,
      items: options.releaseItems,
      language: options.copy.language,
      subject: `[Coptic Compass Preview] ${options.copy.subject}`,
    }),
    text: buildContentReleaseEmailText({
      body: options.copy.body,
      items: options.releaseItems,
      language: options.copy.language,
    }),
    to: options.env.ownerAlertEmail,
  });

  revalidateAdminPaths();

  if (!result.success) {
    return {
      success: false,
      message: "The preview email could not be sent right now.",
    };
  }

  return {
    success: true,
    message: `Preview sent to ${options.env.ownerAlertEmail}.`,
  };
}

/**
 * Sends one owner-only preview of the current release snapshots using the
 * selected locale so copy and item ordering can be reviewed before delivery.
 */
export async function sendContentReleasePreview(
  _prevState: SendContentReleaseState | null,
  formData: FormData,
): Promise<SendContentReleaseState> {
  const adminContext = await getValidatedAdminContext();
  if (!adminContext) {
    return {
      success: false,
      message: "Release previews are unavailable right now.",
    };
  }

  const env = getNotificationEmailEnv();
  if (!env?.ownerAlertEmail) {
    return {
      success: false,
      message: "Release preview sending is not configured yet.",
    };
  }

  const { supabase } = adminContext;
  const releaseId = normalizeWhitespace(getFormString(formData, "release_id"));
  const previewLocaleRaw = normalizeWhitespace(
    getFormString(formData, "preview_locale"),
  );
  const previewLocale: Language = previewLocaleRaw === "nl" ? "nl" : "en";

  if (!isUuid(releaseId)) {
    return {
      success: false,
      message: "Choose a valid release draft before sending a preview.",
    };
  }

  const deliveryContext = await loadContentReleaseForDelivery(
    releaseId,
    supabase,
  );
  if (!deliveryContext) {
    return {
      success: false,
      message: "Could not load that release draft preview.",
    };
  }
  const { items: releaseItems, release } = deliveryContext;

  const copy = getContentReleaseCopyForLocale(release, previewLocale);
  if (!copy.subject || !copy.body) {
    return {
      success: false,
      message: "That locale does not have complete release copy yet.",
    };
  }

  return dispatchReleasePreviewEmail({
    copy: copy as typeof copy & { subject: string; body: string },
    env: env as typeof env & { ownerAlertEmail: string },
    release,
    releaseId,
    releaseItems,
  });
}
