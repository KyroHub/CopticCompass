import type { AdminWorkspaceMode } from "@/features/admin/lib/workspaceMode";
import {
  hasAudienceSubscriptions,
  type AdminAudienceContactRow,
} from "@/features/communications/lib/communications";
import { listContentReleaseCandidates } from "@/features/communications/lib/releaseCandidates";
import type {
  AdminContentRelease,
  ContentReleaseCandidate,
} from "@/features/communications/lib/releases";
import {
  getAdminAudienceContacts,
  getAdminContentReleases,
} from "@/features/communications/lib/server/queries";
import type { ContactMessageRow } from "@/features/contact/lib/contact";
import { getAdminContactMessages } from "@/features/contact/lib/server/queries";
import { getDictionaryEntryById } from "@/features/dictionary/lib/dictionary";
import type { EntryReportWithEntry } from "@/features/dictionary/lib/entryActions";
import { getAdminEntryReports } from "@/features/dictionary/lib/server/queries";
import {
  isNotificationFailureStatus,
  isNotificationHistoryStatus,
  notificationFailureStatuses,
  type AdminNotificationEvent,
  type NotificationEventRow,
} from "@/features/notifications/lib/notifications";
import { getAdminNotificationEvents } from "@/features/notifications/lib/server/queries";
import { getAdminSubmissions } from "@/features/submissions/lib/server/queries";
import type { AdminSubmission } from "@/features/submissions/types";
import { withScalabilityTimer } from "@/lib/server/observability";
import type { QueryResult, AppSupabaseClient } from "@/lib/supabase/queryTypes";
import type { Tables } from "@/types/supabase";

export interface AdminAudienceMetrics {
  bookAudienceCount: number;
  generalAudienceCount: number;
  lessonAudienceCount: number;
  resendSyncErrorCount: number;
  resendSyncedAudienceCount: number;
  subscribedAudienceContactsCount: number;
  totalAudienceContactsCount: number;
}

export interface AdminNotificationMetrics {
  acceptedNotificationCount: number;
  bouncedNotificationCount: number;
  complainedNotificationCount: number;
  delayedNotificationCount: number;
  deliveredNotificationCount: number;
  failedNotificationCount: number;
  queuedNotificationCount: number;
  recentNotificationCount: number;
  sentNotificationCount: number;
  suppressedNotificationCount: number;
}

type AdminOperationalAlertId =
  | "audience-sync-error-rate"
  | "complaint-events"
  | "dead-letter-email-jobs"
  | "expired-processing-email-jobs"
  | "failed-provider-webhooks"
  | "missing-signup-alerts"
  | "recent-bounce-rate"
  | "stale-content-releases"
  | "stale-email-queue";

export type AdminOperationalAlert = {
  id: AdminOperationalAlertId;
  tone: "danger" | "warning";
};

export interface AdminNotificationOperations {
  activeSuppressionCount: number;
  audienceSyncErrorCount: number;
  bouncedNotificationCount: number;
  complainedNotificationCount: number;
  deadLetterEmailJobCount: number;
  expiredProcessingEmailJobCount: number;
  failedEmailJobCount: number;
  failedWebhookEventCount: number;
  latestAcceptedEmailJobAt: string | null;
  latestExerciseSubmissionNotificationAt: string | null;
  latestExerciseSubmissionNotificationStatus:
    | NotificationEventRow["status"]
    | null;
  latestSignupNotificationAt: string | null;
  latestSignupNotificationStatus: NotificationEventRow["status"] | null;
  nextRetryEmailJobAt: string | null;
  oldestEligibleEmailJobAt: string | null;
  oldestReceivedWebhookAt: string | null;
  operationalAlerts: AdminOperationalAlert[];
  processingEmailJobCount: number;
  queuedEmailJobCount: number;
  receivedWebhookEventCount: number;
  recentSignupMissingNotificationCount: number;
  retryScheduledEmailJobCount: number;
  staleContentReleaseCount: number;
  totalAudienceContactCount: number;
}

export interface AdminWorkspaceOverview {
  actionableReleaseCount: number;
  audienceSyncErrorCount: number;
  failedNotificationCount: number;
  openContactMessageCount: number;
  openEntryReportCount: number;
  pendingSubmissionCount: number;
}

type LoadedDashboardSection<T> = {
  error: QueryResult<T>["error"];
  items: T;
};

export type AdminDashboardData = {
  audience: LoadedDashboardSection<AdminAudienceContactRow[]> & {
    metrics: AdminAudienceMetrics;
  };
  contactMessages: LoadedDashboardSection<ContactMessageRow[]>;
  contentReleases: LoadedDashboardSection<AdminContentRelease[]> & {
    lessonReleaseCandidates: ContentReleaseCandidate[];
    publicationReleaseCandidates: ContentReleaseCandidate[];
  };
  entryReports: LoadedDashboardSection<EntryReportWithEntry[]>;
  notifications: LoadedDashboardSection<AdminNotificationEvent[]> & {
    metrics: AdminNotificationMetrics;
    operations: AdminNotificationOperations;
  };
  submissions: LoadedDashboardSection<AdminSubmission[]>;
};

type AdminReviewDashboardData = Pick<
  AdminDashboardData,
  "contactMessages" | "entryReports" | "submissions"
>;

type AdminCommunicationsDashboardData = Pick<
  AdminDashboardData,
  "audience" | "contentReleases"
>;

type AdminSystemDashboardData = Pick<AdminDashboardData, "notifications">;

/**
 * Normalizes a query result into the dashboard section shape, defaulting
 * missing row data to an empty list while preserving the original error.
 */
function withItems<T>(result: QueryResult<T[]>): LoadedDashboardSection<T[]> {
  return {
    error: result.error,
    items: result.data ?? [],
  };
}

/**
 * Executes a count query used by the admin overview cards and treats count
 * failures as zero after logging the corresponding label.
 */
async function getExactCount(
  label: string,
  query: PromiseLike<{
    count: number | null;
    error: {
      code?: string;
      details?: string | null;
      hint?: string | null;
      message?: string;
    } | null;
  }>,
) {
  const result = await query;

  if (result.error) {
    const errorDetails = {
      code: result.error.code,
      details: result.error.details,
      hint: result.error.hint,
      message: result.error.message ?? "Unknown query error",
    };

    console.warn(`Unable to load admin ${label} count; falling back to 0.`, {
      error: errorDetails,
    });
    return 0;
  }

  return result.count ?? 0;
}

async function getFirstOperationalRow<T>(
  label: string,
  query: PromiseLike<{
    data: T[] | null;
    error: {
      code?: string;
      details?: string | null;
      hint?: string | null;
      message?: string;
    } | null;
  }>,
) {
  const result = await query;

  if (result.error) {
    const errorDetails = {
      code: result.error.code,
      details: result.error.details,
      hint: result.error.hint,
      message: result.error.message ?? "Unknown query error",
    };

    console.warn(`Unable to load admin ${label}; falling back to empty.`, {
      error: errorDetails,
    });
    return null;
  }

  return result.data?.[0] ?? null;
}

async function getOperationalRows<T>(
  label: string,
  query: PromiseLike<{
    data: T[] | null;
    error: {
      code?: string;
      details?: string | null;
      hint?: string | null;
      message?: string;
    } | null;
  }>,
) {
  const result = await query;

  if (result.error) {
    const errorDetails = {
      code: result.error.code,
      details: result.error.details,
      hint: result.error.hint,
      message: result.error.message ?? "Unknown query error",
    };

    console.warn(`Unable to load admin ${label}; falling back to empty.`, {
      error: errorDetails,
    });
    return [];
  }

  return result.data ?? [];
}

function hasCountErrorMessage(error: {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message?: string;
}) {
  return Boolean(error.message && error.message.trim().length > 0);
}

function shouldRetryPendingCountWithoutDeletedAt(error: {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message?: string;
}) {
  if (!hasCountErrorMessage(error)) {
    return true;
  }

  const normalizedMessage = error.message!.toLowerCase();
  return error.code === "42703" || normalizedMessage.includes("deleted_at");
}

const OPERATIONAL_QUEUE_STALE_MS = 5 * 60 * 1000;
const OPERATIONAL_AUDIENCE_SYNC_ERROR_RATE_THRESHOLD = 0.1;
const OPERATIONAL_RECENT_SIGNUP_ALERT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const OPERATIONAL_RECENT_SIGNUP_SAMPLE_SIZE = 100;

export function buildAdminOperationalAlerts(options: {
  metrics: Pick<
    AdminNotificationMetrics,
    "bouncedNotificationCount" | "recentNotificationCount"
  >;
  now: Date;
  operations: Omit<AdminNotificationOperations, "operationalAlerts">;
}): AdminOperationalAlert[] {
  const alerts: AdminOperationalAlert[] = [];
  const oldestEligibleTime = options.operations.oldestEligibleEmailJobAt
    ? new Date(options.operations.oldestEligibleEmailJobAt).getTime()
    : null;

  if (
    oldestEligibleTime !== null &&
    Number.isFinite(oldestEligibleTime) &&
    options.now.getTime() - oldestEligibleTime >= OPERATIONAL_QUEUE_STALE_MS
  ) {
    alerts.push({
      id: "stale-email-queue",
      tone: "warning",
    });
  }

  if (options.operations.expiredProcessingEmailJobCount > 0) {
    alerts.push({
      id: "expired-processing-email-jobs",
      tone: "danger",
    });
  }

  if (options.operations.deadLetterEmailJobCount > 0) {
    alerts.push({
      id: "dead-letter-email-jobs",
      tone: "danger",
    });
  }

  if (options.operations.failedWebhookEventCount > 0) {
    alerts.push({
      id: "failed-provider-webhooks",
      tone: "danger",
    });
  }

  if (options.operations.recentSignupMissingNotificationCount > 0) {
    alerts.push({
      id: "missing-signup-alerts",
      tone: "warning",
    });
  }

  if (options.operations.complainedNotificationCount > 0) {
    alerts.push({
      id: "complaint-events",
      tone: "danger",
    });
  }

  if (options.operations.staleContentReleaseCount > 0) {
    alerts.push({
      id: "stale-content-releases",
      tone: "warning",
    });
  }

  if (options.operations.totalAudienceContactCount > 0) {
    const audienceSyncErrorRate =
      options.operations.audienceSyncErrorCount /
      options.operations.totalAudienceContactCount;

    if (
      audienceSyncErrorRate >= OPERATIONAL_AUDIENCE_SYNC_ERROR_RATE_THRESHOLD
    ) {
      alerts.push({
        id: "audience-sync-error-rate",
        tone: "warning",
      });
    }
  }

  if (
    options.metrics.recentNotificationCount >= 20 &&
    options.metrics.bouncedNotificationCount /
      options.metrics.recentNotificationCount >=
      0.05
  ) {
    alerts.push({
      id: "recent-bounce-rate",
      tone: "warning",
    });
  }

  return alerts;
}

async function countRecentSignupProfilesMissingNotifications(
  supabase: AppSupabaseClient,
  cutoffIso: string,
) {
  const recentProfiles = await getOperationalRows<
    Pick<Tables<"profiles">, "id">
  >(
    "recent signup profiles",
    supabase
      .from("profiles")
      .select("id")
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(OPERATIONAL_RECENT_SIGNUP_SAMPLE_SIZE),
  );

  const profileIds = recentProfiles
    .map((profile) => profile.id)
    .filter((id): id is string => Boolean(id));

  if (profileIds.length === 0) {
    return 0;
  }

  const signupNotifications = await getOperationalRows<
    Pick<Tables<"notification_events">, "aggregate_id">
  >(
    "recent signup notification events",
    supabase
      .from("notification_events")
      .select("aggregate_id")
      .eq("aggregate_type", "profile")
      .eq("event_type", "profile_signup")
      .in("aggregate_id", profileIds),
  );
  const alertedProfileIds = new Set(
    signupNotifications.map((event) => event.aggregate_id),
  );

  return profileIds.filter((profileId) => !alertedProfileIds.has(profileId))
    .length;
}

async function getPendingSubmissionCount(supabase: AppSupabaseClient) {
  const filteredResult = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .is("deleted_at", null);

  if (!filteredResult.error) {
    return filteredResult.count ?? 0;
  }

  if (!shouldRetryPendingCountWithoutDeletedAt(filteredResult.error)) {
    const errorDetails = {
      code: filteredResult.error.code,
      details: filteredResult.error.details,
      hint: filteredResult.error.hint,
      message: filteredResult.error.message ?? "Unknown query error",
    };

    console.warn(
      "Unable to load admin pending submissions count; falling back to 0.",
      { error: errorDetails },
    );
    return 0;
  }

  const fallbackResult = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (!fallbackResult.error) {
    return fallbackResult.count ?? 0;
  }

  const fallbackErrorDetails = {
    code: fallbackResult.error.code,
    details: fallbackResult.error.details,
    hint: fallbackResult.error.hint,
    message: fallbackResult.error.message ?? "Unknown query error",
  };

  console.warn(
    "Unable to load admin pending submissions count; falling back to 0.",
    {
      error: fallbackErrorDetails,
    },
  );
  return 0;
}

/**
 * Derives the audience metrics shown in the communications workspace from the
 * loaded admin contact rows and their sync-state metadata.
 */
export function buildAdminAudienceMetrics(
  contacts: readonly Pick<
    AdminAudienceContactRow,
    "books_opt_in" | "general_updates_opt_in" | "lessons_opt_in" | "syncState"
  >[],
): AdminAudienceMetrics {
  return {
    bookAudienceCount: contacts.filter((contact) => contact.books_opt_in)
      .length,
    generalAudienceCount: contacts.filter(
      (contact) => contact.general_updates_opt_in,
    ).length,
    lessonAudienceCount: contacts.filter((contact) => contact.lessons_opt_in)
      .length,
    resendSyncErrorCount: contacts.filter((contact) =>
      Boolean(contact.syncState?.last_error),
    ).length,
    resendSyncedAudienceCount: contacts.filter((contact) =>
      Boolean(contact.syncState?.last_synced_at),
    ).length,
    subscribedAudienceContactsCount: contacts.filter((contact) =>
      hasAudienceSubscriptions(contact),
    ).length,
    totalAudienceContactsCount: contacts.length,
  };
}

/**
 * Derives the notification summary cards from the recent admin notification
 * event list.
 */
export function buildAdminNotificationMetrics(
  events: readonly Pick<AdminNotificationEvent, "status">[],
): AdminNotificationMetrics {
  return {
    acceptedNotificationCount: events.filter(
      (event) => event.status === "accepted" || event.status === "sent",
    ).length,
    bouncedNotificationCount: events.filter(
      (event) => event.status === "bounced",
    ).length,
    complainedNotificationCount: events.filter(
      (event) => event.status === "complained",
    ).length,
    delayedNotificationCount: events.filter(
      (event) => event.status === "delayed",
    ).length,
    deliveredNotificationCount: events.filter(
      (event) => event.status === "delivered",
    ).length,
    failedNotificationCount: events.filter((event) =>
      isNotificationFailureStatus(event.status),
    ).length,
    queuedNotificationCount: events.filter(
      (event) => event.status === "queued" || event.status === "processing",
    ).length,
    recentNotificationCount: events.length,
    sentNotificationCount: events.filter((event) =>
      isNotificationHistoryStatus(event.status),
    ).length,
    suppressedNotificationCount: events.filter(
      (event) => event.status === "suppressed",
    ).length,
  };
}

/**
 * Counts pending submission reviews for the admin overview.
 */
export function countPendingSubmissions(
  submissions: readonly Pick<AdminSubmission, "status">[],
) {
  return submissions.filter((submission) => submission.status === "pending")
    .length;
}

/**
 * Counts contact messages that still need attention from the admin workspace.
 */
export function countOpenContactMessages(
  messages: readonly Pick<ContactMessageRow, "status">[],
) {
  return messages.filter(
    (message) => message.status === "new" || message.status === "in_progress",
  ).length;
}

/**
 * Counts entry reports that are still open in the review workspace.
 */
export function countOpenEntryReports(
  reports: readonly Pick<EntryReportWithEntry["report"], "status">[],
) {
  return reports.filter((report) => report.status === "open").length;
}

/**
 * Counts releases that are approved or already in the delivery pipeline.
 */
export function countActionableContentReleases(
  releases: readonly Pick<AdminContentRelease, "status">[],
) {
  return releases.filter(
    (release) =>
      release.status === "approved" ||
      release.status === "queued" ||
      release.status === "sending",
  ).length;
}

/**
 * Builds the top-level admin workspace overview counts from the already loaded
 * dashboard sections and derived metrics.
 */
export function buildAdminWorkspaceOverview(
  data: Pick<
    AdminDashboardData,
    | "audience"
    | "contactMessages"
    | "contentReleases"
    | "entryReports"
    | "notifications"
    | "submissions"
  >,
): AdminWorkspaceOverview {
  return {
    actionableReleaseCount: countActionableContentReleases(
      data.contentReleases.items,
    ),
    audienceSyncErrorCount: data.audience.metrics.resendSyncErrorCount,
    failedNotificationCount: data.notifications.metrics.failedNotificationCount,
    openContactMessageCount: countOpenContactMessages(
      data.contactMessages.items,
    ),
    openEntryReportCount: countOpenEntryReports(
      data.entryReports.items.map((item) => item.report),
    ),
    pendingSubmissionCount: countPendingSubmissions(data.submissions.items),
  };
}

/**
 * Loads the lightweight exact-count queries that power the compact admin
 * workspace overview without fetching every dashboard section in full.
 */
export async function loadAdminWorkspaceOverview(
  supabase: AppSupabaseClient,
): Promise<AdminWorkspaceOverview> {
  return withScalabilityTimer(
    "admin.dashboard.load_workspace_overview",
    async () => {
      const [
        pendingSubmissionCount,
        openContactMessageCount,
        openEntryReportCount,
        actionableReleaseCount,
        audienceSyncErrorCount,
        failedNotificationCount,
      ] = await Promise.all([
        getPendingSubmissionCount(supabase),
        getExactCount(
          "open contact messages",
          supabase
            .from("contact_messages")
            .select("id", { count: "exact", head: true })
            .in("status", ["new", "in_progress"]),
        ),
        getExactCount(
          "open entry reports",
          supabase
            .from("entry_reports")
            .select("id", { count: "exact", head: true })
            .eq("status", "open"),
        ),
        getExactCount(
          "actionable content releases",
          supabase
            .from("content_releases")
            .select("id", { count: "exact", head: true })
            .in("status", ["approved", "queued", "sending"]),
        ),
        getExactCount(
          "audience sync errors",
          supabase
            .from("audience_contact_sync_state")
            .select("audience_contact_id", { count: "exact", head: true })
            .not("last_error", "is", null),
        ),
        getExactCount(
          "failed notifications",
          supabase
            .from("notification_events")
            .select("id", { count: "exact", head: true })
            .in("status", [...notificationFailureStatuses]),
        ),
      ]);

      return {
        actionableReleaseCount,
        audienceSyncErrorCount,
        failedNotificationCount,
        openContactMessageCount,
        openEntryReportCount,
        pendingSubmissionCount,
      };
    },
    {
      summarizeResult: (overview) => ({
        ...overview,
      }),
    },
  );
}

/**
 * Splits the current release candidates into lesson and publication groups for
 * the communications workspace draft builder.
 */
function buildReleaseCandidates() {
  const releaseCandidates = listContentReleaseCandidates();

  return {
    lessonReleaseCandidates: releaseCandidates.filter(
      (candidate) => candidate.itemType === "lesson",
    ),
    publicationReleaseCandidates: releaseCandidates.filter(
      (candidate) => candidate.itemType === "publication",
    ),
  };
}

/**
 * Preserves the already enriched entry report items as a dedicated helper so
 * dashboard assembly can evolve without reshaping callers.
 */
function buildEntryReportItems(
  reports: AdminDashboardData["entryReports"]["items"],
) {
  return reports;
}

function summarizeDashboardSectionErrors(sections: Array<{ error: unknown }>) {
  return sections.filter((section) => Boolean(section.error)).length;
}

function summarizeAdminDashboardSections(data: AdminDashboardData) {
  return {
    audienceContactsCount: data.audience.metrics.totalAudienceContactsCount,
    contentReleaseCandidateCount:
      data.contentReleases.lessonReleaseCandidates.length +
      data.contentReleases.publicationReleaseCandidates.length,
    contentReleaseCount: data.contentReleases.items.length,
    contactMessageCount: data.contactMessages.items.length,
    entryReportCount: data.entryReports.items.length,
    notificationCount: data.notifications.items.length,
    sectionErrorCount: summarizeDashboardSectionErrors([
      data.audience,
      data.contactMessages,
      data.contentReleases,
      data.entryReports,
      data.notifications,
      data.submissions,
    ]),
    submissionCount: data.submissions.items.length,
  };
}

function summarizeAdminReviewSections(data: AdminReviewDashboardData) {
  return {
    contactMessageCount: data.contactMessages.items.length,
    entryReportCount: data.entryReports.items.length,
    sectionErrorCount: summarizeDashboardSectionErrors([
      data.contactMessages,
      data.entryReports,
      data.submissions,
    ]),
    submissionCount: data.submissions.items.length,
  };
}

function summarizeAdminCommunicationsSections(
  data: AdminCommunicationsDashboardData,
) {
  return {
    audienceContactsCount: data.audience.metrics.totalAudienceContactsCount,
    contentReleaseCandidateCount:
      data.contentReleases.lessonReleaseCandidates.length +
      data.contentReleases.publicationReleaseCandidates.length,
    contentReleaseCount: data.contentReleases.items.length,
    sectionErrorCount: summarizeDashboardSectionErrors([
      data.audience,
      data.contentReleases,
    ]),
  };
}

function summarizeAdminSystemSections(data: AdminSystemDashboardData) {
  return {
    notificationCount: data.notifications.items.length,
    sectionErrorCount: summarizeDashboardSectionErrors([data.notifications]),
  };
}

/**
 * Loads exact audience metrics for the admin communications workspace without
 * depending on the bounded list window used by the visible contact list.
 */
async function loadAdminAudienceMetrics(
  supabase: AppSupabaseClient,
): Promise<AdminAudienceMetrics> {
  const [
    bookAudienceCount,
    generalAudienceCount,
    lessonAudienceCount,
    resendSyncErrorCount,
    resendSyncedAudienceCount,
    subscribedAudienceContactsCount,
    totalAudienceContactsCount,
  ] = await Promise.all([
    getExactCount(
      "book audience",
      supabase
        .from("audience_contacts")
        .select("id", { count: "exact", head: true })
        .eq("books_opt_in", true),
    ),
    getExactCount(
      "general audience",
      supabase
        .from("audience_contacts")
        .select("id", { count: "exact", head: true })
        .eq("general_updates_opt_in", true),
    ),
    getExactCount(
      "lesson audience",
      supabase
        .from("audience_contacts")
        .select("id", { count: "exact", head: true })
        .eq("lessons_opt_in", true),
    ),
    getExactCount(
      "audience sync errors",
      supabase
        .from("audience_contact_sync_state")
        .select("audience_contact_id", { count: "exact", head: true })
        .not("last_error", "is", null),
    ),
    getExactCount(
      "synced audience contacts",
      supabase
        .from("audience_contact_sync_state")
        .select("audience_contact_id", { count: "exact", head: true })
        .not("last_synced_at", "is", null),
    ),
    getExactCount(
      "subscribed audience contacts",
      supabase
        .from("audience_contacts")
        .select("id", { count: "exact", head: true })
        .or(
          "books_opt_in.eq.true,general_updates_opt_in.eq.true,lessons_opt_in.eq.true",
        ),
    ),
    getExactCount(
      "total audience contacts",
      supabase
        .from("audience_contacts")
        .select("id", { count: "exact", head: true }),
    ),
  ]);

  return {
    bookAudienceCount,
    generalAudienceCount,
    lessonAudienceCount,
    resendSyncErrorCount,
    resendSyncedAudienceCount,
    subscribedAudienceContactsCount,
    totalAudienceContactsCount,
  };
}

async function loadAdminNotificationOperations(
  supabase: AppSupabaseClient,
  metrics: AdminNotificationMetrics,
  now = new Date(),
): Promise<AdminNotificationOperations> {
  const nowIso = now.toISOString();
  const staleContentReleaseIso = new Date(
    now.getTime() - 2 * 60 * 60 * 1000,
  ).toISOString();
  const recentSignupAlertCutoffIso = new Date(
    now.getTime() - OPERATIONAL_RECENT_SIGNUP_ALERT_WINDOW_MS,
  ).toISOString();

  const [
    queuedEmailJobCount,
    processingEmailJobCount,
    retryScheduledEmailJobCount,
    failedEmailJobCount,
    deadLetterEmailJobCount,
    expiredProcessingEmailJobCount,
    failedWebhookEventCount,
    receivedWebhookEventCount,
    activeSuppressionCount,
    bouncedNotificationCount,
    complainedNotificationCount,
    staleContentReleaseCount,
    audienceSyncErrorCount,
    totalAudienceContactCount,
    oldestEligibleEmailJob,
    nextRetryEmailJob,
    oldestReceivedWebhook,
    latestAcceptedEmailJob,
    latestSignupNotification,
    latestExerciseSubmissionNotification,
    recentSignupMissingNotificationCount,
  ] = await Promise.all([
    getExactCount(
      "queued notification email jobs",
      supabase
        .from("notification_email_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "queued"),
    ),
    getExactCount(
      "processing notification email jobs",
      supabase
        .from("notification_email_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "processing"),
    ),
    getExactCount(
      "retry scheduled notification email jobs",
      supabase
        .from("notification_email_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "retry_scheduled"),
    ),
    getExactCount(
      "failed notification email jobs",
      supabase
        .from("notification_email_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed"),
    ),
    getExactCount(
      "dead letter notification email jobs",
      supabase
        .from("notification_email_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "dead_letter"),
    ),
    getExactCount(
      "expired processing notification email jobs",
      supabase
        .from("notification_email_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "processing")
        .lt("lock_expires_at", nowIso),
    ),
    getExactCount(
      "failed provider webhook events",
      supabase
        .from("provider_webhook_events")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed"),
    ),
    getExactCount(
      "received provider webhook events",
      supabase
        .from("provider_webhook_events")
        .select("id", { count: "exact", head: true })
        .eq("status", "received"),
    ),
    getExactCount(
      "active audience suppressions",
      supabase
        .from("audience_suppressions")
        .select("id", { count: "exact", head: true })
        .is("lifted_at", null),
    ),
    getExactCount(
      "bounced notification events",
      supabase
        .from("notification_events")
        .select("id", { count: "exact", head: true })
        .eq("status", "bounced"),
    ),
    getExactCount(
      "complained notification events",
      supabase
        .from("notification_events")
        .select("id", { count: "exact", head: true })
        .eq("status", "complained"),
    ),
    getExactCount(
      "stale content releases",
      supabase
        .from("content_releases")
        .select("id", { count: "exact", head: true })
        .in("status", ["queued", "sending"])
        .lt("updated_at", staleContentReleaseIso),
    ),
    getExactCount(
      "audience sync errors",
      supabase
        .from("audience_contact_sync_state")
        .select("audience_contact_id", { count: "exact", head: true })
        .not("last_error", "is", null),
    ),
    getExactCount(
      "total audience contacts",
      supabase
        .from("audience_contacts")
        .select("id", { count: "exact", head: true }),
    ),
    getFirstOperationalRow<
      Pick<Tables<"notification_email_jobs">, "next_attempt_at">
    >(
      "oldest eligible notification email job",
      supabase
        .from("notification_email_jobs")
        .select("next_attempt_at")
        .in("status", ["queued", "retry_scheduled"])
        .lte("next_attempt_at", nowIso)
        .order("next_attempt_at", { ascending: true })
        .limit(1),
    ),
    getFirstOperationalRow<
      Pick<Tables<"notification_email_jobs">, "next_attempt_at">
    >(
      "next retry notification email job",
      supabase
        .from("notification_email_jobs")
        .select("next_attempt_at")
        .eq("status", "retry_scheduled")
        .gte("next_attempt_at", nowIso)
        .order("next_attempt_at", { ascending: true })
        .limit(1),
    ),
    getFirstOperationalRow<
      Pick<Tables<"provider_webhook_events">, "received_at">
    >(
      "oldest received provider webhook event",
      supabase
        .from("provider_webhook_events")
        .select("received_at")
        .eq("status", "received")
        .order("received_at", { ascending: true })
        .limit(1),
    ),
    getFirstOperationalRow<
      Pick<Tables<"notification_email_jobs">, "processed_at">
    >(
      "latest accepted notification email job",
      supabase
        .from("notification_email_jobs")
        .select("processed_at")
        .eq("status", "accepted")
        .not("processed_at", "is", null)
        .order("processed_at", { ascending: false })
        .limit(1),
    ),
    getFirstOperationalRow<
      Pick<Tables<"notification_events">, "created_at" | "status">
    >(
      "latest signup notification event",
      supabase
        .from("notification_events")
        .select("created_at,status")
        .eq("event_type", "profile_signup")
        .order("created_at", { ascending: false })
        .limit(1),
    ),
    getFirstOperationalRow<
      Pick<Tables<"notification_events">, "created_at" | "status">
    >(
      "latest exercise submission notification event",
      supabase
        .from("notification_events")
        .select("created_at,status")
        .eq("event_type", "exercise_submission_received")
        .order("created_at", { ascending: false })
        .limit(1),
    ),
    countRecentSignupProfilesMissingNotifications(
      supabase,
      recentSignupAlertCutoffIso,
    ),
  ]);

  const operations = {
    activeSuppressionCount,
    audienceSyncErrorCount,
    bouncedNotificationCount,
    complainedNotificationCount,
    deadLetterEmailJobCount,
    expiredProcessingEmailJobCount,
    failedEmailJobCount,
    failedWebhookEventCount,
    latestAcceptedEmailJobAt: latestAcceptedEmailJob?.processed_at ?? null,
    latestExerciseSubmissionNotificationAt:
      latestExerciseSubmissionNotification?.created_at ?? null,
    latestExerciseSubmissionNotificationStatus:
      latestExerciseSubmissionNotification?.status ?? null,
    latestSignupNotificationAt: latestSignupNotification?.created_at ?? null,
    latestSignupNotificationStatus: latestSignupNotification?.status ?? null,
    nextRetryEmailJobAt: nextRetryEmailJob?.next_attempt_at ?? null,
    oldestEligibleEmailJobAt: oldestEligibleEmailJob?.next_attempt_at ?? null,
    oldestReceivedWebhookAt: oldestReceivedWebhook?.received_at ?? null,
    processingEmailJobCount,
    queuedEmailJobCount,
    receivedWebhookEventCount,
    recentSignupMissingNotificationCount,
    retryScheduledEmailJobCount,
    staleContentReleaseCount,
    totalAudienceContactCount,
  } satisfies Omit<AdminNotificationOperations, "operationalAlerts">;

  return {
    ...operations,
    operationalAlerts: buildAdminOperationalAlerts({
      metrics,
      now,
      operations,
    }),
  };
}

/**
 * Loads the full admin dashboard read model, enriching and grouping each
 * section so the workspace UI can render from one coherent payload.
 */
async function _loadAdminDashboardData(
  supabase: AppSupabaseClient,
): Promise<AdminDashboardData> {
  return withScalabilityTimer(
    "admin.dashboard.load_full_dashboard",
    async () => {
      const [
        submissionsResult,
        contactMessagesResult,
        audienceContactsResult,
        audienceMetrics,
        contentReleasesResult,
        entryReportsResult,
        notificationEventsResult,
      ] = await Promise.all([
        getAdminSubmissions(supabase),
        getAdminContactMessages(supabase),
        getAdminAudienceContacts(supabase),
        loadAdminAudienceMetrics(supabase),
        getAdminContentReleases(supabase),
        getAdminEntryReports(supabase),
        getAdminNotificationEvents(supabase),
      ]);

      const submissions = withItems(submissionsResult);
      const contactMessages = withItems(contactMessagesResult);
      const audience = withItems(audienceContactsResult);
      const contentReleases = withItems(contentReleasesResult);
      const notifications = withItems(notificationEventsResult);
      const notificationMetrics = buildAdminNotificationMetrics(
        notifications.items,
      );
      const notificationOperations = await loadAdminNotificationOperations(
        supabase,
        notificationMetrics,
      );
      const entryReports = {
        error: entryReportsResult.error,
        items: buildEntryReportItems(
          (entryReportsResult.data ?? []).map((report) => ({
            entry: getDictionaryEntryById(report.entry_id),
            report,
          })),
        ),
      };

      return {
        audience: {
          ...audience,
          metrics: audienceMetrics,
        },
        contactMessages,
        contentReleases: {
          ...contentReleases,
          ...buildReleaseCandidates(),
        },
        entryReports,
        notifications: {
          ...notifications,
          metrics: notificationMetrics,
          operations: notificationOperations,
        },
        submissions,
      };
    },
    {
      summarizeResult: summarizeAdminDashboardSections,
    },
  );
}

/**
 * Loads only the admin review sections used by the review workspace.
 */
export async function loadAdminReviewDashboardData(
  supabase: AppSupabaseClient,
): Promise<AdminReviewDashboardData> {
  return withScalabilityTimer(
    "admin.dashboard.load_review_workspace",
    async () => {
      const [submissionsResult, contactMessagesResult, entryReportsResult] =
        await Promise.all([
          getAdminSubmissions(supabase),
          getAdminContactMessages(supabase),
          getAdminEntryReports(supabase),
        ]);

      return {
        contactMessages: withItems(contactMessagesResult),
        entryReports: {
          error: entryReportsResult.error,
          items: buildEntryReportItems(
            (entryReportsResult.data ?? []).map((report) => ({
              entry: getDictionaryEntryById(report.entry_id),
              report,
            })),
          ),
        },
        submissions: withItems(submissionsResult),
      };
    },
    {
      summarizeResult: summarizeAdminReviewSections,
    },
  );
}

/**
 * Loads only the communications sections used by the admin communications
 * workspace, including derived audience metrics and release candidates.
 */
export async function loadAdminCommunicationsDashboardData(
  supabase: AppSupabaseClient,
): Promise<AdminCommunicationsDashboardData> {
  return withScalabilityTimer(
    "admin.dashboard.load_communications_workspace",
    async () => {
      const [audienceContactsResult, audienceMetrics, contentReleasesResult] =
        await Promise.all([
          getAdminAudienceContacts(supabase),
          loadAdminAudienceMetrics(supabase),
          getAdminContentReleases(supabase),
        ]);

      const audience = withItems(audienceContactsResult);
      const contentReleases = withItems(contentReleasesResult);

      return {
        audience: {
          ...audience,
          metrics: audienceMetrics,
        },
        contentReleases: {
          ...contentReleases,
          ...buildReleaseCandidates(),
        },
      };
    },
    {
      summarizeResult: summarizeAdminCommunicationsSections,
    },
  );
}

/**
 * Loads only the system-notification section used by the admin system
 * workspace.
 */
export async function loadAdminSystemDashboardData(
  supabase: AppSupabaseClient,
): Promise<AdminSystemDashboardData> {
  return withScalabilityTimer(
    "admin.dashboard.load_system_workspace",
    async () => {
      const notificationEventsResult =
        await getAdminNotificationEvents(supabase);
      const notifications = withItems(notificationEventsResult);
      const notificationMetrics = buildAdminNotificationMetrics(
        notifications.items,
      );
      const notificationOperations = await loadAdminNotificationOperations(
        supabase,
        notificationMetrics,
      );

      return {
        notifications: {
          ...notifications,
          metrics: notificationMetrics,
          operations: notificationOperations,
        },
      };
    },
    {
      summarizeResult: summarizeAdminSystemSections,
    },
  );
}

/**
 * Loads the dashboard payload for the selected workspace mode so callers can
 * fetch only the sections needed for the current admin view.
 */
async function _loadAdminDashboardDataForMode(
  supabase: AppSupabaseClient,
  mode: AdminWorkspaceMode,
) {
  switch (mode) {
    case "communications":
      return {
        communications: await loadAdminCommunicationsDashboardData(supabase),
      } as const;
    case "system":
      return {
        system: await loadAdminSystemDashboardData(supabase),
      } as const;
    case "review":
    default:
      return {
        review: await loadAdminReviewDashboardData(supabase),
      } as const;
  }
}
