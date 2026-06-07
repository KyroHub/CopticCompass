import { PageHeader } from "@/components/PageHeader";
import {
  adminQueueLinkClassName,
  adminSummaryPanelClassName,
} from "@/features/admin/components/adminControlStyles";
import { formatAdminNumber } from "@/features/admin/components/AdminDashboardSectionShared";
import type { AdminWorkspaceOverview } from "@/features/admin/lib/dashboardData";
import type { Language } from "@/types/i18n";

import { adminDashboardSectionsCopy } from "./adminDashboardSectionsCopy";

export function AdminReviewInboxSummary({
  language,
  overview,
}: {
  language: Language;
  overview: AdminWorkspaceOverview;
}) {
  const copy = adminDashboardSectionsCopy[language].reviewInbox;
  const reviewQueueTotal =
    overview.pendingSubmissionCount +
    overview.openContactMessageCount +
    overview.openEntryReportCount;
  const queueLinks = [
    {
      count: overview.pendingSubmissionCount,
      href: "#admin-submissions",
      label: copy.links.submissions.label,
      note: copy.links.submissions.note,
      tone: overview.pendingSubmissionCount > 0 ? "accent" : "surface",
    },
    {
      count: overview.openContactMessageCount,
      href: "#admin-contact-inbox",
      label: copy.links.inbox.label,
      note: copy.links.inbox.note,
      tone: overview.openContactMessageCount > 0 ? "accent" : "surface",
    },
    {
      count: overview.openEntryReportCount,
      href: "#admin-entry-reports",
      label: copy.links.reports.label,
      note: copy.links.reports.note,
      tone: overview.openEntryReportCount > 0 ? "accent" : "surface",
    },
  ] as const;

  return (
    <section className={adminSummaryPanelClassName()}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <PageHeader
            as="h2"
            align="left"
            size="section"
            title={
              reviewQueueTotal > 0
                ? `${formatAdminNumber(reviewQueueTotal, language)} ${copy.activeTitleSuffix}`
                : copy.clearTitle
            }
            description={
              reviewQueueTotal > 0
                ? copy.activeDescription
                : copy.clearDescription
            }
          />
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {copy.liveQueues}: {formatAdminNumber(reviewQueueTotal, language)}
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {queueLinks.map((queue) => (
          <a
            key={queue.href}
            href={queue.href}
            className={adminQueueLinkClassName()}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-semibold text-ink">
                {queue.label}
              </span>
              <span className="text-sm font-semibold text-muted">
                {formatAdminNumber(queue.count, language)}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">{queue.note}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
