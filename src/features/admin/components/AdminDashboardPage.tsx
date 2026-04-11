import { PageHeader } from "@/components/PageHeader";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import {
  AdminAudienceSection,
  AdminCommunicationsDesk,
  AdminContactInboxSection,
  AdminEntryReportsSection,
  AdminNotificationsSection,
  AdminRagKnowledgeSection,
  AdminReleasesSection,
  AdminReviewInboxSummary,
  AdminSubmissionsSection,
  AdminSystemHealthSummary,
  AdminWorkspaceQuickJump,
} from "@/features/admin/components/AdminDashboardSections";
import { AdminWorkspaceModeShell } from "@/features/admin/components/AdminWorkspaceModeShell";
import {
  loadAdminCommunicationsDashboardData,
  loadAdminReviewDashboardData,
  loadAdminSystemDashboardData,
  loadAdminWorkspaceOverview,
} from "@/features/admin/lib/dashboardData";
import type { AdminWorkspaceMode } from "@/features/admin/lib/workspaceMode";
import { requireAdminPageSession } from "@/lib/supabase/auth";

import type { ReactNode } from "react";

export async function AdminDashboardPage({
  initialMode = "review",
  redirectTo = "/admin",
}: {
  initialMode?: AdminWorkspaceMode;
  redirectTo?: string;
}) {
  const { supabase } = await requireAdminPageSession(redirectTo);
  const workspaceOverview = await loadAdminWorkspaceOverview(supabase);
  const mode = initialMode;
  let modeContent: ReactNode;

  if (mode === "communications") {
    const dashboardData = await loadAdminCommunicationsDashboardData(supabase);

    modeContent = (
      <>
        <AdminCommunicationsDesk
          audience={dashboardData.audience}
          contentReleases={dashboardData.contentReleases}
          overview={workspaceOverview}
        />
        <AdminWorkspaceQuickJump
          overview={workspaceOverview}
          mode="communications"
        />

        <div className="space-y-8">
          <AdminReleasesSection
            contentReleases={dashboardData.contentReleases}
            showComposer={false}
          />
          <AdminAudienceSection
            audience={dashboardData.audience}
            showSyncForm={false}
          />
        </div>
      </>
    );
  } else if (mode === "system") {
    const dashboardData = await loadAdminSystemDashboardData(supabase);

    modeContent = (
      <>
        <AdminSystemHealthSummary
          overview={workspaceOverview}
          notifications={dashboardData.notifications}
        />
        <AdminWorkspaceQuickJump overview={workspaceOverview} mode="system" />

        <div className="space-y-8">
          <AdminNotificationsSection
            notifications={dashboardData.notifications}
          />
          <AdminRagKnowledgeSection />
        </div>
      </>
    );
  } else {
    const dashboardData = await loadAdminReviewDashboardData(supabase);

    modeContent = (
      <>
        <AdminReviewInboxSummary overview={workspaceOverview} />
        <AdminWorkspaceQuickJump overview={workspaceOverview} mode="review" />

        <div className="space-y-8">
          <AdminSubmissionsSection submissions={dashboardData.submissions} />
          <AdminContactInboxSection
            contactMessages={dashboardData.contactMessages}
          />
          <AdminEntryReportsSection entryReports={dashboardData.entryReports} />
          <AdminRagKnowledgeSection />
        </div>
      </>
    );
  }

  return (
    <PageShell
      className="min-h-screen px-6 py-16"
      contentClassName="min-h-[80vh] animate-in fade-in slide-in-from-bottom-8 duration-700"
      width="standard"
      accents={[
        pageShellAccents.heroEmeraldArc,
        pageShellAccents.topRightSkyOrbInset,
      ]}
    >
      <PageHeader
        title="Instructor Terminal"
        description="Review submitted exercises, score translations, and send feedback."
        align="left"
        tone="analytics"
        size="compact"
        className="mb-12"
      />

      <AdminWorkspaceModeShell mode={mode} overview={workspaceOverview}>
        {modeContent}
      </AdminWorkspaceModeShell>
    </PageShell>
  );
}
