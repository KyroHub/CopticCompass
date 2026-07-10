import { describe, expect, it } from "vitest";

import type { AudienceContactSyncStateRow } from "@/features/communications/lib/communications";
import type { AdminContentRelease } from "@/features/communications/lib/releases";
import type { ContactMessageRow } from "@/features/contact/lib/contact";
import type { EntryReportWithEntry } from "@/features/dictionary/lib/entryActions";
import type { AdminSubmission } from "@/features/submissions/types";

import {
  buildAdminWorkspaceOverview,
  buildAdminAudienceMetrics,
  buildAdminNotificationMetrics,
  buildAdminOperationalAlerts,
  countActionableContentReleases,
  countOpenContactMessages,
  countOpenEntryReports,
  countPendingSubmissions,
  type AdminNotificationOperations,
} from "./dashboardData";

function createSyncState(
  overrides: Partial<AudienceContactSyncStateRow>,
): AudienceContactSyncStateRow {
  return {
    audience_contact_id: "contact-1",
    created_at: "2025-01-01T00:00:00.000Z",
    last_error: null,
    last_synced_at: null,
    provider: "resend",
    provider_contact_id: null,
    updated_at: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createNotificationOperations(
  overrides: Partial<AdminNotificationOperations> = {},
): AdminNotificationOperations {
  return {
    activeSuppressionCount: 0,
    audienceSyncErrorCount: 0,
    bouncedNotificationCount: 0,
    complainedNotificationCount: 0,
    deadLetterEmailJobCount: 0,
    expiredProcessingEmailJobCount: 0,
    failedEmailJobCount: 0,
    failedWebhookEventCount: 0,
    nextRetryEmailJobAt: null,
    oldestEligibleEmailJobAt: null,
    oldestReceivedWebhookAt: null,
    operationalAlerts: [],
    processingEmailJobCount: 0,
    queuedEmailJobCount: 0,
    receivedWebhookEventCount: 0,
    retryScheduledEmailJobCount: 0,
    staleContentReleaseCount: 0,
    totalAudienceContactCount: 0,
    ...overrides,
  };
}

describe("admin dashboard data helpers", () => {
  it("builds audience metrics from subscription and sync state data", () => {
    expect(
      buildAdminAudienceMetrics([
        {
          books_opt_in: true,
          general_updates_opt_in: false,
          lessons_opt_in: true,
          syncState: createSyncState({
            last_synced_at: "2025-01-01T00:00:00.000Z",
          }),
        },
        {
          books_opt_in: false,
          general_updates_opt_in: true,
          lessons_opt_in: false,
          syncState: createSyncState({
            last_error: "boom",
            last_synced_at: null,
          }),
        },
        {
          books_opt_in: false,
          general_updates_opt_in: false,
          lessons_opt_in: false,
          syncState: null,
        },
      ]),
    ).toEqual({
      bookAudienceCount: 1,
      generalAudienceCount: 1,
      lessonAudienceCount: 1,
      resendSyncErrorCount: 1,
      resendSyncedAudienceCount: 1,
      subscribedAudienceContactsCount: 2,
      totalAudienceContactsCount: 3,
    });
  });

  it("builds notification metrics from status counts", () => {
    expect(
      buildAdminNotificationMetrics([
        { status: "failed" },
        { status: "bounced" },
        { status: "complained" },
        { status: "delayed" },
        { status: "delivered" },
        { status: "processing" },
        { status: "sent" },
        { status: "suppressed" },
        { status: "queued" },
      ]),
    ).toEqual({
      acceptedNotificationCount: 1,
      bouncedNotificationCount: 1,
      complainedNotificationCount: 1,
      delayedNotificationCount: 1,
      deliveredNotificationCount: 1,
      failedNotificationCount: 4,
      queuedNotificationCount: 2,
      recentNotificationCount: 9,
      sentNotificationCount: 2,
      suppressedNotificationCount: 1,
    });
  });

  it("builds operational alerts from bounded system metrics", () => {
    const alerts = buildAdminOperationalAlerts({
      metrics: {
        bouncedNotificationCount: 1,
        recentNotificationCount: 20,
      },
      now: new Date("2026-06-24T10:10:00.000Z"),
      operations: createNotificationOperations({
        audienceSyncErrorCount: 2,
        complainedNotificationCount: 1,
        deadLetterEmailJobCount: 1,
        expiredProcessingEmailJobCount: 1,
        failedWebhookEventCount: 1,
        oldestEligibleEmailJobAt: "2026-06-24T10:00:00.000Z",
        staleContentReleaseCount: 1,
        totalAudienceContactCount: 10,
      }),
    });

    expect(alerts.map((alert) => alert.id)).toEqual([
      "stale-email-queue",
      "expired-processing-email-jobs",
      "dead-letter-email-jobs",
      "failed-provider-webhooks",
      "complaint-events",
      "stale-content-releases",
      "audience-sync-error-rate",
      "recent-bounce-rate",
    ]);
  });

  it("counts pending submissions", () => {
    expect(
      countPendingSubmissions([
        { status: "pending" },
        { status: "reviewed" },
        { status: "pending" },
      ]),
    ).toBe(2);
  });

  it("counts open contact messages", () => {
    expect(
      countOpenContactMessages([
        { status: "new" },
        { status: "in_progress" },
        { status: "answered" },
        { status: "archived" },
      ]),
    ).toBe(2);
  });

  it("counts open entry reports", () => {
    expect(
      countOpenEntryReports([
        { status: "open" },
        { status: "reviewed" },
        { status: "resolved" },
        { status: "open" },
      ]),
    ).toBe(2);
  });

  it("counts actionable content releases", () => {
    expect(
      countActionableContentReleases([
        { status: "draft" },
        { status: "approved" },
        { status: "queued" },
        { status: "sending" },
        { status: "sent" },
      ]),
    ).toBe(3);
  });

  it("builds an admin workspace overview from section data", () => {
    expect(
      buildAdminWorkspaceOverview({
        audience: {
          error: null,
          items: [],
          metrics: {
            bookAudienceCount: 0,
            generalAudienceCount: 0,
            lessonAudienceCount: 0,
            resendSyncErrorCount: 2,
            resendSyncedAudienceCount: 4,
            subscribedAudienceContactsCount: 5,
            totalAudienceContactsCount: 6,
          },
        },
        contactMessages: {
          error: null,
          items: [
            { status: "new" },
            { status: "answered" },
          ] as unknown as ContactMessageRow[],
        },
        contentReleases: {
          error: null,
          items: [
            { status: "approved" },
            { status: "draft" },
          ] as unknown as AdminContentRelease[],
          lessonReleaseCandidates: [],
          publicationReleaseCandidates: [],
        },
        entryReports: {
          error: null,
          items: [
            {
              entry: null,
              report: { status: "open" },
            },
          ] as unknown as EntryReportWithEntry[],
        },
        notifications: {
          error: null,
          items: [],
          metrics: {
            acceptedNotificationCount: 1,
            bouncedNotificationCount: 0,
            complainedNotificationCount: 0,
            delayedNotificationCount: 0,
            deliveredNotificationCount: 1,
            failedNotificationCount: 1,
            queuedNotificationCount: 0,
            recentNotificationCount: 3,
            sentNotificationCount: 2,
            suppressedNotificationCount: 0,
          },
          operations: createNotificationOperations(),
        },
        submissions: {
          error: null,
          items: [
            { status: "pending" },
            { status: "reviewed" },
          ] as unknown as AdminSubmission[],
        },
      }),
    ).toEqual({
      actionableReleaseCount: 1,
      audienceSyncErrorCount: 2,
      failedNotificationCount: 1,
      openContactMessageCount: 1,
      openEntryReportCount: 1,
      pendingSubmissionCount: 1,
    });
  });
});
