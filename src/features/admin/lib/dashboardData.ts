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
import type { AdminNotificationEvent } from "@/features/notifications/lib/notifications";
import { getAdminNotificationEvents } from "@/features/notifications/lib/server/queries";
import { getAdminSubmissions } from "@/features/submissions/lib/server/queries";
import type { AdminSubmission } from "@/features/submissions/types";
import { withScalabilityTimer } from "@/lib/server/observability";
import type { QueryResult, AppSupabaseClient } from "@/lib/supabase/queryTypes";

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
  failedNotificationCount: number;
  recentNotificationCount: number;
  sentNotificationCount: number;
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
    failedNotificationCount: events.filter((event) => event.status === "failed")
      .length,
    recentNotificationCount: events.length,
    sentNotificationCount: events.filter((event) => event.status === "sent")
      .length,
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
            .eq("status", "failed"),
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
          metrics: buildAdminNotificationMetrics(notifications.items),
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

      return {
        notifications: {
          ...notifications,
          metrics: buildAdminNotificationMetrics(notifications.items),
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
