import { EmptyState } from "@/components/EmptyState";
import {
  AdminDatabaseErrorState,
  formatAdminNumber,
} from "@/features/admin/components/AdminDashboardSectionShared";
import { AdminContentReleasesList } from "@/features/admin/components/AdminFilteredLists";
import { AdminPersistentSection } from "@/features/admin/components/AdminPersistentSection";
import {
  countActionableContentReleases,
  type AdminDashboardData,
} from "@/features/admin/lib/dashboardData";
import { CreateContentReleaseForm } from "@/features/communications/components/CreateContentReleaseForm";
import type { Language } from "@/types/i18n";

import { adminDashboardSectionsCopy } from "./adminDashboardSectionsCopy";

export function AdminReleasesSection({
  contentReleases,
  language,
  showComposer = true,
}: {
  contentReleases: AdminDashboardData["contentReleases"];
  language: Language;
  showComposer?: boolean;
}) {
  const copy = adminDashboardSectionsCopy[language].releases;
  const actionableCount = countActionableContentReleases(contentReleases.items);
  const releasesContent = (() => {
    if (contentReleases.error) {
      return (
        <AdminDatabaseErrorState
          details={contentReleases.error}
          language={language}
          message={copy.dbError}
        />
      );
    }

    if (contentReleases.items.length === 0) {
      return (
        <EmptyState
          title={copy.emptyTitle}
          description={copy.emptyDescription}
        />
      );
    }

    return <AdminContentReleasesList releases={contentReleases.items} />;
  })();

  return (
    <AdminPersistentSection
      id="admin-releases"
      title={copy.title}
      description={copy.description}
      summary={
        contentReleases.items.length === 0
          ? copy.noSummary
          : `${formatAdminNumber(actionableCount, language)} ${copy.active} · ${formatAdminNumber(
              contentReleases.items.length,
              language,
            )} ${copy.recentWindow}`
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
