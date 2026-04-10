import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import {
  AdminContentReleasesList,
  AdminContactMessagesList,
  AdminEntryReportsList,
  AdminSubmissionsList,
} from "@/features/admin/components/AdminFilteredLists";
import { AdminOverflowDisclosure } from "@/features/admin/components/AdminListPrimitives";
import { AdminPersistentSection } from "@/features/admin/components/AdminPersistentSection";
import { AdminRagIngestionForm } from "@/features/admin/components/AdminRagIngestionForm";
import {
  countActionableContentReleases,
  countOpenContactMessages,
  countOpenEntryReports,
  countPendingSubmissions,
  type AdminDashboardData,
  type AdminWorkspaceOverview,
} from "@/features/admin/lib/dashboardData";
import { splitAdminVisibleItems } from "@/features/admin/lib/listPrimitives";
import type { AdminWorkspaceMode } from "@/features/admin/lib/workspaceMode";
import { AdminAudienceContactCard } from "@/features/communications/components/AdminAudienceContactCard";
import { CreateContentReleaseForm } from "@/features/communications/components/CreateContentReleaseForm";
import { SyncAudienceContactsForm } from "@/features/communications/components/SyncAudienceContactsForm";
import { AdminNotificationEventCard } from "@/features/notifications/components/AdminNotificationEventCard";

function AdminDatabaseErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center font-bold text-red-500 dark:border-red-900/40 dark:bg-red-950/20">
      {message}
    </div>
  );
}

function buildSectionSummary(total: number, active: number, label: string) {
  if (total === 0) {
    return `No ${label.toLowerCase()}`;
  }

  if (active <= 0) {
    return `${total} ${label.toLowerCase()}`;
  }

  return `${active} active · ${total} total`;
}

export function AdminWorkspaceQuickJump({
  overview,
  mode,
}: {
  overview: AdminWorkspaceOverview;
  mode: AdminWorkspaceMode;
}) {
  const allLinks = {
    communications: [
      {
        count: overview.actionableReleaseCount,
        href: "#admin-releases",
        label: "Releases",
        tone: overview.actionableReleaseCount > 0 ? "coptic" : "surface",
      },
      {
        count: overview.audienceSyncErrorCount,
        href: "#admin-audience",
        label: "Audience",
        tone: overview.audienceSyncErrorCount > 0 ? "accent" : "surface",
      },
    ],
    review: [
      {
        count: overview.pendingSubmissionCount,
        href: "#admin-submissions",
        label: "Submissions",
        tone: overview.pendingSubmissionCount > 0 ? "accent" : "surface",
      },
      {
        count: overview.openContactMessageCount,
        href: "#admin-contact-inbox",
        label: "Inbox",
        tone: overview.openContactMessageCount > 0 ? "accent" : "surface",
      },
      {
        count: overview.openEntryReportCount,
        href: "#admin-entry-reports",
        label: "Reports",
        tone: overview.openEntryReportCount > 0 ? "accent" : "surface",
      },
    ],
    system: [
      {
        count: overview.failedNotificationCount,
        href: "#admin-notifications",
        label: "Alerts",
        tone: overview.failedNotificationCount > 0 ? "accent" : "surface",
      },
    ],
  } as const;

  const links = allLinks[mode];
  let modeDescription =
    "Inspect delivery health and operational alerts without the rest of the workspace competing for attention.";

  if (mode === "review") {
    modeDescription =
      "Stay inside the live teaching queues. History now lives inside each section, so this view stays focused on work that still needs you.";
  } else if (mode === "communications") {
    modeDescription =
      "Focus on outbound announcements and audience health without carrying the review queues with you.";
  }

  return (
    <nav className="app-sticky-panel mb-8 rounded-[2rem] border border-stone-200/80 bg-white/85 p-4 shadow-lg backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/75 dark:shadow-black/20">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="flat" size="xs" caps>
          Quick Jump
        </Badge>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          {modeDescription}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
          >
            <Badge
              tone={link.tone}
              size="sm"
              className="transition hover:-translate-y-0.5"
            >
              {link.label}: {link.count}
            </Badge>
          </a>
        ))}
      </div>
    </nav>
  );
}

export function AdminReviewInboxSummary({
  overview,
}: {
  overview: AdminWorkspaceOverview;
}) {
  const reviewQueueTotal =
    overview.pendingSubmissionCount +
    overview.openContactMessageCount +
    overview.openEntryReportCount;
  const queueLinks = [
    {
      count: overview.pendingSubmissionCount,
      href: "#admin-submissions",
      label: "Submissions",
      note: "Translation work waiting for scoring and feedback.",
      tone: overview.pendingSubmissionCount > 0 ? "accent" : "surface",
    },
    {
      count: overview.openContactMessageCount,
      href: "#admin-contact-inbox",
      label: "Inbox",
      note: "Open conversations from learners and visitors.",
      tone: overview.openContactMessageCount > 0 ? "accent" : "surface",
    },
    {
      count: overview.openEntryReportCount,
      href: "#admin-entry-reports",
      label: "Reports",
      note: "Dictionary feedback and entry issues to resolve.",
      tone: overview.openEntryReportCount > 0 ? "accent" : "surface",
    },
  ] as const;

  return (
    <section className="rounded-[2rem] border border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-emerald-50/60 p-6 shadow-lg shadow-sky-100/30 dark:border-sky-900/40 dark:from-sky-950/35 dark:via-stone-950 dark:to-emerald-950/20 dark:shadow-black/20">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Badge tone="accent" size="xs" caps>
            Review Inbox
          </Badge>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-50">
              {reviewQueueTotal > 0
                ? `${reviewQueueTotal} active items need attention`
                : "Your review queues are clear"}
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-stone-600 dark:text-stone-400">
              {reviewQueueTotal > 0
                ? "Start with the live queues below. Reviewed, archived, and resolved work stays tucked into each section's history view so this mode can stay calm."
                : "Nothing urgent is waiting right now. You can still open each section to revisit history or switch into Communications and System when you want the slower administrative work."}
            </p>
          </div>
        </div>

        <Badge tone={reviewQueueTotal > 0 ? "coptic" : "surface"} size="sm">
          Live queues: {reviewQueueTotal}
        </Badge>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {queueLinks.map((queue) => (
          <a
            key={queue.href}
            href={queue.href}
            className="rounded-[1.5rem] border border-white/80 bg-white/80 p-4 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 dark:border-stone-800 dark:bg-stone-950/60 dark:hover:border-sky-900/50"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-semibold text-stone-900 dark:text-stone-100">
                {queue.label}
              </span>
              <Badge tone={queue.tone} size="xs">
                {queue.count}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-400">
              {queue.note}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}

export function AdminCommunicationsDesk({
  audience,
  contentReleases,
  overview,
}: {
  audience: AdminDashboardData["audience"];
  contentReleases: AdminDashboardData["contentReleases"];
  overview: AdminWorkspaceOverview;
}) {
  const totalCandidates =
    contentReleases.lessonReleaseCandidates.length +
    contentReleases.publicationReleaseCandidates.length;
  const reachableAudienceCount =
    audience.metrics.subscribedAudienceContactsCount;

  return (
    <section className="rounded-[2rem] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50/50 p-6 shadow-lg shadow-emerald-100/30 dark:border-emerald-900/40 dark:from-emerald-950/25 dark:via-stone-950 dark:to-sky-950/20 dark:shadow-black/20">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Badge tone="coptic" size="xs" caps>
            Communications Desk
          </Badge>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-50">
              Plan releases without carrying the review queues with you
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-stone-600 dark:text-stone-400">
              Draft new announcements here, keep the audience in sync with
              Resend, and let the release and contact history sit further down
              the page instead of crowding the compose flow.
            </p>
          </div>
        </div>

        <Badge
          tone={overview.actionableReleaseCount > 0 ? "coptic" : "surface"}
          size="sm"
        >
          Active releases: {overview.actionableReleaseCount}
        </Badge>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <div
          className={surfacePanelClassName({
            rounded: "3xl",
            variant: "subtle",
            className: "p-4",
          })}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
            Reachable audience
          </p>
          <p className="mt-3 text-2xl font-semibold text-stone-950 dark:text-stone-50">
            {reachableAudienceCount}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
            Contacts who can receive lessons, books, or general updates now.
          </p>
        </div>

        <div
          className={surfacePanelClassName({
            rounded: "3xl",
            variant: "subtle",
            className: "p-4",
          })}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
            Sync health
          </p>
          <p className="mt-3 text-2xl font-semibold text-stone-950 dark:text-stone-50">
            {audience.metrics.resendSyncErrorCount}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
            Contacts with sync issues that need a resend or manual check.
          </p>
        </div>

        <div
          className={surfacePanelClassName({
            rounded: "3xl",
            variant: "subtle",
            className: "p-4",
          })}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
            Draft inputs
          </p>
          <p className="mt-3 text-2xl font-semibold text-stone-950 dark:text-stone-50">
            {totalCandidates}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
            Published lessons and publications currently available to announce.
          </p>
        </div>

        <div
          className={surfacePanelClassName({
            rounded: "3xl",
            variant: "subtle",
            className: "p-4",
          })}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
            In queue
          </p>
          <p className="mt-3 text-2xl font-semibold text-stone-950 dark:text-stone-50">
            {
              contentReleases.items.filter(
                (release) =>
                  release.status === "queued" || release.status === "sending",
              ).length
            }
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
            Releases already queued or actively delivering in the background.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <CreateContentReleaseForm
          lessonCandidates={contentReleases.lessonReleaseCandidates}
          publicationCandidates={contentReleases.publicationReleaseCandidates}
        />

        <div
          className={surfacePanelClassName({
            rounded: "3xl",
            variant: "elevated",
            className: "p-6 md:p-7",
          })}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="surface" size="xs">
              Synced: {audience.metrics.resendSyncedAudienceCount}
            </Badge>
            <Badge
              tone={
                audience.metrics.resendSyncErrorCount > 0 ? "accent" : "surface"
              }
              size="xs"
            >
              Sync errors: {audience.metrics.resendSyncErrorCount}
            </Badge>
          </div>

          <h3 className="mt-4 text-xl font-semibold text-stone-950 dark:text-stone-50">
            Audience sync
          </h3>
          <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-stone-400">
            Push the current audience preferences to Resend before sending a
            release, especially after new signups or preference changes.
          </p>

          <div className="mt-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4 dark:border-stone-800 dark:bg-stone-950/40">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                  Lessons
                </p>
                <p className="mt-2 text-lg font-semibold text-stone-950 dark:text-stone-50">
                  {audience.metrics.lessonAudienceCount}
                </p>
              </div>
              <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4 dark:border-stone-800 dark:bg-stone-950/40">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                  Books + general
                </p>
                <p className="mt-2 text-lg font-semibold text-stone-950 dark:text-stone-50">
                  {audience.metrics.bookAudienceCount +
                    audience.metrics.generalAudienceCount}
                </p>
              </div>
            </div>

            <SyncAudienceContactsForm />
          </div>
        </div>
      </div>
    </section>
  );
}

export function AdminSystemHealthSummary({
  overview,
  notifications,
}: {
  overview: AdminWorkspaceOverview;
  notifications: AdminDashboardData["notifications"];
}) {
  const queuedNotificationCount = notifications.items.filter(
    (event) => event.status === "queued",
  ).length;

  return (
    <section className="rounded-[2rem] border border-stone-200/80 bg-gradient-to-br from-stone-50 via-white to-sky-50/30 p-6 shadow-lg shadow-stone-200/40 dark:border-stone-800 dark:from-stone-950 dark:via-stone-950 dark:to-sky-950/10 dark:shadow-black/20">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Badge tone="surface" size="xs" caps>
            System Health
          </Badge>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-50">
              {overview.failedNotificationCount > 0
                ? `${overview.failedNotificationCount} delivery issue${overview.failedNotificationCount === 1 ? "" : "s"} need attention`
                : "Delivery health is steady"}
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-stone-600 dark:text-stone-400">
              This mode is meant for quiet operational checks. Failures and
              queued sends surface first, while successful delivery history sits
              below as a reference log.
            </p>
          </div>
        </div>

        <Badge
          tone={overview.failedNotificationCount > 0 ? "accent" : "surface"}
          size="sm"
        >
          Failed notifications: {overview.failedNotificationCount}
        </Badge>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div
          className={surfacePanelClassName({
            rounded: "3xl",
            variant: "subtle",
            className: "p-4",
          })}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
            Failed
          </p>
          <p className="mt-3 text-2xl font-semibold text-stone-950 dark:text-stone-50">
            {notifications.metrics.failedNotificationCount}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
            Notifications that need investigation or a resend.
          </p>
        </div>

        <div
          className={surfacePanelClassName({
            rounded: "3xl",
            variant: "subtle",
            className: "p-4",
          })}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
            Queued
          </p>
          <p className="mt-3 text-2xl font-semibold text-stone-950 dark:text-stone-50">
            {queuedNotificationCount}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
            Events that are waiting to process or still completing.
          </p>
        </div>

        <div
          className={surfacePanelClassName({
            rounded: "3xl",
            variant: "subtle",
            className: "p-4",
          })}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
            Recent sent
          </p>
          <p className="mt-3 text-2xl font-semibold text-stone-950 dark:text-stone-50">
            {notifications.metrics.sentNotificationCount}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
            Successfully delivered notifications in the recent log window.
          </p>
        </div>
      </div>
    </section>
  );
}

export function AdminSubmissionsSection({
  submissions,
}: {
  submissions: AdminDashboardData["submissions"];
}) {
  const pendingCount = countPendingSubmissions(submissions.items);

  return (
    <AdminPersistentSection
      id="admin-submissions"
      title="Exercise submissions"
      description="Review translation work, assign a score, and return feedback to students."
      summary={buildSectionSummary(
        submissions.items.length,
        pendingCount,
        "submissions",
      )}
      headerBadges={
        <>
          <Badge tone={pendingCount > 0 ? "accent" : "surface"} size="xs">
            Needs review: {pendingCount}
          </Badge>
          <Badge tone="surface" size="xs">
            Reviewed:{" "}
            {
              submissions.items.filter(
                (submission) => submission.status === "reviewed",
              ).length
            }
          </Badge>
        </>
      }
      defaultOpen
    >
      {submissions.error ? (
        <AdminDatabaseErrorState message="Database Error: Could not load submissions. Make sure you've run the SQL setup script." />
      ) : (
        <AdminSubmissionsList submissions={submissions.items} />
      )}
    </AdminPersistentSection>
  );
}

export function AdminRagKnowledgeSection() {
  return (
    <AdminPersistentSection
      id="admin-rag-knowledge"
      title="RAG knowledge ingestion"
      description="Upload knowledge files to enrich Shenute AI context. Files are parsed, OCR-checked, chunked (default target 1600 chars with 200 overlap), embedded via your selected provider (Hugging Face or Gemini), and stored in pgvector. RAG status also tracks dictionary.json and grammar JSON knowledge sources."
      summary="Multi-file ingestion with OCR + embeddings"
      headerBadges={
        <>
          <Badge tone="coptic" size="xs">
            Embeddings: selectable
          </Badge>
          <Badge tone="surface" size="xs">
            Destination: coptic_documents
          </Badge>
        </>
      }
      defaultOpen
    >
      <AdminRagIngestionForm />
    </AdminPersistentSection>
  );
}

export function AdminAudienceSection({
  audience,
  showSyncForm = true,
}: {
  audience: AdminDashboardData["audience"];
  showSyncForm?: boolean;
}) {
  const { metrics } = audience;
  const defaultOpen =
    Boolean(audience.error) || metrics.resendSyncErrorCount > 0;
  const {
    overflow: overflowAudienceContacts,
    visible: visibleAudienceContacts,
  } = splitAdminVisibleItems(audience.items);
  const audienceContent = (() => {
    if (audience.error) {
      return (
        <AdminDatabaseErrorState message="Database Error: Could not load audience contacts. Make sure you've run the latest SQL setup script." />
      );
    }

    if (audience.items.length === 0) {
      return (
        <EmptyState
          title="No audience contacts yet."
          description="Opt-ins from the contact form, signup flow, and dashboard preferences will appear here."
        />
      );
    }

    return (
      <div className="space-y-6">
        {showSyncForm ? <SyncAudienceContactsForm /> : null}

        {visibleAudienceContacts.map((contact) => (
          <AdminAudienceContactCard key={contact.id} contact={contact} />
        ))}

        {overflowAudienceContacts.length > 0 ? (
          <AdminOverflowDisclosure
            count={overflowAudienceContacts.length}
            label="audience contact"
          >
            {overflowAudienceContacts.map((contact) => (
              <AdminAudienceContactCard key={contact.id} contact={contact} />
            ))}
          </AdminOverflowDisclosure>
        ) : null}
      </div>
    );
  })();

  return (
    <AdminPersistentSection
      id="admin-audience"
      title="Audience communication"
      description="Track who has opted into release emails before you start sending lesson or publication announcements. The list keeps actionable contacts in full and shows a recent inactive window below them."
      summary={
        metrics.totalAudienceContactsCount === 0
          ? "No contacts yet"
          : `${metrics.subscribedAudienceContactsCount} reachable · ${metrics.totalAudienceContactsCount} total`
      }
      headerBadges={
        <>
          <Badge tone="surface" size="xs">
            Synced: {metrics.resendSyncedAudienceCount}
          </Badge>
          <Badge
            tone={metrics.resendSyncErrorCount > 0 ? "accent" : "surface"}
            size="xs"
          >
            Sync errors: {metrics.resendSyncErrorCount}
          </Badge>
          <Badge tone="coptic" size="xs">
            Lessons: {metrics.lessonAudienceCount}
          </Badge>
        </>
      }
      defaultOpen={defaultOpen}
    >
      {audienceContent}
    </AdminPersistentSection>
  );
}

export function AdminReleasesSection({
  contentReleases,
  showComposer = true,
}: {
  contentReleases: AdminDashboardData["contentReleases"];
  showComposer?: boolean;
}) {
  const actionableCount = countActionableContentReleases(contentReleases.items);
  const queuedCount = contentReleases.items.filter(
    (release) => release.status === "queued" || release.status === "sending",
  ).length;
  const releasesContent = (() => {
    if (contentReleases.error) {
      return (
        <AdminDatabaseErrorState message="Database Error: Could not load content releases. Make sure you've run the latest SQL setup script." />
      );
    }

    if (contentReleases.items.length === 0) {
      return (
        <EmptyState
          title="No release drafts yet."
          description="Create a draft above to snapshot the published lessons or publications you want to announce."
        />
      );
    }

    return <AdminContentReleasesList releases={contentReleases.items} />;
  })();

  return (
    <AdminPersistentSection
      id="admin-releases"
      title="Release drafts"
      description="Build snapshot-based announcement drafts for published lessons and publications. The list below shows the latest release activity window so the workspace stays lightweight."
      summary={
        contentReleases.items.length === 0
          ? "No release drafts yet"
          : `${actionableCount} active · ${contentReleases.items.length} in recent window`
      }
      headerBadges={
        <>
          <Badge tone={actionableCount > 0 ? "coptic" : "surface"} size="xs">
            Ready or live: {actionableCount}
          </Badge>
          <Badge tone="surface" size="xs">
            In queue: {queuedCount}
          </Badge>
          <Badge tone="surface" size="xs">
            Candidates:{" "}
            {contentReleases.lessonReleaseCandidates.length +
              contentReleases.publicationReleaseCandidates.length}
          </Badge>
        </>
      }
      defaultOpen={Boolean(contentReleases.error) || actionableCount > 0}
    >
      <div className="space-y-6">
        {showComposer ? (
          <CreateContentReleaseForm
            lessonCandidates={contentReleases.lessonReleaseCandidates}
            publicationCandidates={contentReleases.publicationReleaseCandidates}
          />
        ) : null}

        {releasesContent}
      </div>
    </AdminPersistentSection>
  );
}

export function AdminContactInboxSection({
  contactMessages,
}: {
  contactMessages: AdminDashboardData["contactMessages"];
}) {
  const openMessageCount = countOpenContactMessages(contactMessages.items);
  const contactMessagesContent = (() => {
    if (contactMessages.error) {
      return (
        <AdminDatabaseErrorState message="Database Error: Could not load contact messages. Make sure you've run the latest SQL setup script." />
      );
    }

    if (contactMessages.items.length === 0) {
      return (
        <EmptyState
          title="No contact messages yet."
          description="When visitors send a message from the contact page, it will appear here for follow-up."
        />
      );
    }

    return <AdminContactMessagesList messages={contactMessages.items} />;
  })();

  return (
    <AdminPersistentSection
      id="admin-contact-inbox"
      title="Contact inbox"
      description="Triage public contact messages, keep track of replies, and note who wants future updates."
      summary={buildSectionSummary(
        contactMessages.items.length,
        openMessageCount,
        "messages",
      )}
      headerBadges={
        <>
          <Badge tone={openMessageCount > 0 ? "accent" : "surface"} size="xs">
            Active: {openMessageCount}
          </Badge>
          <Badge tone="surface" size="xs">
            Answered:{" "}
            {
              contactMessages.items.filter(
                (message) => message.status === "answered",
              ).length
            }
          </Badge>
        </>
      }
      defaultOpen={Boolean(contactMessages.error) || openMessageCount > 0}
    >
      {contactMessagesContent}
    </AdminPersistentSection>
  );
}

export function AdminNotificationsSection({
  notifications,
}: {
  notifications: AdminDashboardData["notifications"];
}) {
  const { metrics } = notifications;
  const attentionNotifications = notifications.items.filter(
    (event) => event.status === "failed" || event.status === "queued",
  );
  const historyNotifications = notifications.items.filter(
    (event) => event.status === "sent",
  );
  const defaultOpen =
    Boolean(notifications.error) || metrics.failedNotificationCount > 0;
  const {
    overflow: overflowAttentionNotifications,
    visible: visibleAttentionNotifications,
  } = splitAdminVisibleItems(attentionNotifications);
  const {
    overflow: overflowHistoryNotifications,
    visible: visibleHistoryNotifications,
  } = splitAdminVisibleItems(historyNotifications);
  const notificationsContent = (() => {
    if (notifications.error) {
      return (
        <AdminDatabaseErrorState message="Database Error: Could not load notification activity. Make sure you've run the latest SQL setup script." />
      );
    }

    if (notifications.items.length === 0) {
      return (
        <EmptyState
          title="No notification activity yet."
          description="Notification events will appear here once contact alerts, submission alerts, and review emails have been sent."
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              tone={attentionNotifications.length > 0 ? "accent" : "surface"}
              size="xs"
            >
              Needs attention: {attentionNotifications.length}
            </Badge>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Failures and still-queued notifications stay at the top.
            </p>
          </div>

          {attentionNotifications.length === 0 ? (
            <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 px-5 py-4 text-sm leading-7 text-stone-600 dark:border-stone-800 dark:bg-stone-950/40 dark:text-stone-400">
              No notification issues are waiting right now.
            </div>
          ) : (
            <>
              {visibleAttentionNotifications.map((event) => (
                <AdminNotificationEventCard key={event.id} event={event} />
              ))}

              {overflowAttentionNotifications.length > 0 ? (
                <AdminOverflowDisclosure
                  count={overflowAttentionNotifications.length}
                  label="notification"
                >
                  {overflowAttentionNotifications.map((event) => (
                    <AdminNotificationEventCard key={event.id} event={event} />
                  ))}
                </AdminOverflowDisclosure>
              ) : null}
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="surface" size="xs">
              Recent delivery log: {historyNotifications.length}
            </Badge>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Successful sends stay available here as a quieter recent audit
              trail.
            </p>
          </div>

          {historyNotifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200/80 bg-stone-50/60 px-5 py-4 text-sm leading-7 text-stone-500 dark:border-stone-800 dark:bg-stone-950/25 dark:text-stone-400">
              Successful sends will collect here once the system starts
              delivering notifications.
            </div>
          ) : (
            <>
              {visibleHistoryNotifications.map((event) => (
                <AdminNotificationEventCard key={event.id} event={event} />
              ))}

              {overflowHistoryNotifications.length > 0 ? (
                <AdminOverflowDisclosure
                  count={overflowHistoryNotifications.length}
                  label="history event"
                >
                  {overflowHistoryNotifications.map((event) => (
                    <AdminNotificationEventCard key={event.id} event={event} />
                  ))}
                </AdminOverflowDisclosure>
              ) : null}
            </>
          )}
        </div>
      </div>
    );
  })();

  return (
    <AdminPersistentSection
      id="admin-notifications"
      title="Notification log"
      description="Use this as a reference area for delivery health: failed or queued events first, then a bounded recent success log beneath."
      summary={
        metrics.recentNotificationCount === 0
          ? "No notification activity yet"
          : `${metrics.failedNotificationCount} failed · ${metrics.sentNotificationCount} sent in recent log`
      }
      headerBadges={
        <>
          <Badge
            tone={metrics.failedNotificationCount > 0 ? "accent" : "surface"}
            size="xs"
          >
            Failed: {metrics.failedNotificationCount}
          </Badge>
          <Badge tone="coptic" size="xs">
            Recent sent: {metrics.sentNotificationCount}
          </Badge>
        </>
      }
      defaultOpen={defaultOpen}
    >
      {notificationsContent}
    </AdminPersistentSection>
  );
}

export function AdminEntryReportsSection({
  entryReports,
}: {
  entryReports: AdminDashboardData["entryReports"];
}) {
  const openReportCount = countOpenEntryReports(
    entryReports.items.map((item) => item.report),
  );
  const entryReportsContent = (() => {
    if (entryReports.error) {
      return (
        <AdminDatabaseErrorState message="Database Error: Could not load dictionary entry reports. Make sure you've run the latest SQL setup script." />
      );
    }

    if (entryReports.items.length === 0) {
      return (
        <EmptyState
          title="No dictionary reports yet."
          description="When readers flag entries from the dictionary, they will appear here for review."
        />
      );
    }

    return <AdminEntryReportsList reports={entryReports.items} />;
  })();

  return (
    <AdminPersistentSection
      id="admin-entry-reports"
      title="Dictionary entry reports"
      description="Review flagged lemmas, inspect the current published meaning, and move each report through your inbox."
      summary={buildSectionSummary(
        entryReports.items.length,
        openReportCount,
        "reports",
      )}
      headerBadges={
        <>
          <Badge tone={openReportCount > 0 ? "accent" : "surface"} size="xs">
            Open: {openReportCount}
          </Badge>
          <Badge tone="surface" size="xs">
            Resolved:{" "}
            {
              entryReports.items.filter(
                (item) => item.report.status === "resolved",
              ).length
            }
          </Badge>
        </>
      }
      defaultOpen={Boolean(entryReports.error) || openReportCount > 0}
    >
      {entryReportsContent}
    </AdminPersistentSection>
  );
}
