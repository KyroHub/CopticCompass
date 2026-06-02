import {
  adminNavChipClassName,
  adminStickyPanelClassName,
} from "@/features/admin/components/adminControlStyles";
import { formatAdminNumber } from "@/features/admin/components/AdminDashboardSectionShared";
import type { AdminWorkspaceOverview } from "@/features/admin/lib/dashboardData";
import type { AdminWorkspaceMode } from "@/features/admin/lib/workspaceMode";
import type { Language } from "@/types/i18n";

import { adminDashboardSectionsCopy } from "./adminDashboardSectionsCopy";

export function AdminWorkspaceQuickJump({
  language,
  overview,
  mode,
}: {
  language: Language;
  overview: AdminWorkspaceOverview;
  mode: AdminWorkspaceMode;
}) {
  const copy = adminDashboardSectionsCopy[language].quickJump;
  const allLinks = {
    communications: [
      {
        count: overview.actionableReleaseCount,
        href: "#admin-releases",
        label: copy.links.releases,
        tone: overview.actionableReleaseCount > 0 ? "coptic" : "surface",
      },
      {
        count: overview.audienceSyncErrorCount,
        href: "#admin-audience",
        label: copy.links.audience,
        tone: overview.audienceSyncErrorCount > 0 ? "accent" : "surface",
      },
    ],
    review: [
      {
        count: overview.pendingSubmissionCount,
        href: "#admin-submissions",
        label: copy.links.submissions,
        tone: overview.pendingSubmissionCount > 0 ? "accent" : "surface",
      },
      {
        count: overview.openContactMessageCount,
        href: "#admin-contact-inbox",
        label: copy.links.inbox,
        tone: overview.openContactMessageCount > 0 ? "accent" : "surface",
      },
      {
        count: overview.openEntryReportCount,
        href: "#admin-entry-reports",
        label: copy.links.reports,
        tone: overview.openEntryReportCount > 0 ? "accent" : "surface",
      },
    ],
    system: [
      {
        count: overview.failedNotificationCount,
        href: "#admin-notifications",
        label: copy.links.alerts,
        tone: overview.failedNotificationCount > 0 ? "accent" : "surface",
      },
    ],
  } as const;

  const links = allLinks[mode];
  const modeDescription = copy.descriptions[mode];

  return (
    <nav className={adminStickyPanelClassName({ className: "mb-6" })}>
      <p className="mb-2 text-xs leading-5 text-muted">{modeDescription}</p>

      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={adminNavChipClassName()}
          >
            <span>{link.label}</span>
            <span className="text-muted">
              {formatAdminNumber(link.count, language)}
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}
