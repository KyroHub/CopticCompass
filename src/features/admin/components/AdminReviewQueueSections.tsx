import { EmptyState } from "@/components/EmptyState";
import {
  AdminDatabaseErrorState,
  buildSectionSummary,
} from "@/features/admin/components/AdminDashboardSectionShared";
import {
  AdminContactMessagesList,
  AdminEntryReportsList,
  AdminSubmissionsList,
} from "@/features/admin/components/AdminFilteredLists";
import { AdminPersistentSection } from "@/features/admin/components/AdminPersistentSection";
import {
  countOpenContactMessages,
  countOpenEntryReports,
  countPendingSubmissions,
  type AdminDashboardData,
} from "@/features/admin/lib/dashboardData";
import type { Language } from "@/types/i18n";

import { adminDashboardSectionsCopy } from "./adminDashboardSectionsCopy";

export function AdminSubmissionsSection({
  language,
  submissions,
}: {
  language: Language;
  submissions: AdminDashboardData["submissions"];
}) {
  const copy = adminDashboardSectionsCopy[language].submissions;
  const pendingCount = countPendingSubmissions(submissions.items);

  return (
    <AdminPersistentSection
      id="admin-submissions"
      title={copy.title}
      description={copy.description}
      summary={buildSectionSummary({
        active: pendingCount,
        labels: copy.summaryLabels,
        language,
        total: submissions.items.length,
      })}
      defaultOpen
    >
      {submissions.error ? (
        <AdminDatabaseErrorState
          details={submissions.error}
          language={language}
          message={copy.dbError}
        />
      ) : (
        <AdminSubmissionsList submissions={submissions.items} />
      )}
    </AdminPersistentSection>
  );
}

export function AdminContactInboxSection({
  contactMessages,
  language,
}: {
  contactMessages: AdminDashboardData["contactMessages"];
  language: Language;
}) {
  const copy = adminDashboardSectionsCopy[language].contactInbox;
  const openMessageCount = countOpenContactMessages(contactMessages.items);
  const contactMessagesContent = (() => {
    if (contactMessages.error) {
      return (
        <AdminDatabaseErrorState
          details={contactMessages.error}
          language={language}
          message={copy.dbError}
        />
      );
    }

    if (contactMessages.items.length === 0) {
      return (
        <EmptyState
          title={copy.emptyTitle}
          description={copy.emptyDescription}
        />
      );
    }

    return <AdminContactMessagesList messages={contactMessages.items} />;
  })();

  return (
    <AdminPersistentSection
      id="admin-contact-inbox"
      title={copy.title}
      description={copy.description}
      summary={buildSectionSummary({
        active: openMessageCount,
        labels: copy.summaryLabels,
        language,
        total: contactMessages.items.length,
      })}
      defaultOpen={Boolean(contactMessages.error) || openMessageCount > 0}
    >
      {contactMessagesContent}
    </AdminPersistentSection>
  );
}

export function AdminEntryReportsSection({
  entryReports,
  language,
}: {
  entryReports: AdminDashboardData["entryReports"];
  language: Language;
}) {
  const copy = adminDashboardSectionsCopy[language].entryReports;
  const openReportCount = countOpenEntryReports(
    entryReports.items.map((item) => item.report),
  );
  const entryReportsContent = (() => {
    if (entryReports.error) {
      return (
        <AdminDatabaseErrorState
          details={entryReports.error}
          language={language}
          message={copy.dbError}
        />
      );
    }

    if (entryReports.items.length === 0) {
      return (
        <EmptyState
          title={copy.emptyTitle}
          description={copy.emptyDescription}
        />
      );
    }

    return <AdminEntryReportsList reports={entryReports.items} />;
  })();

  return (
    <AdminPersistentSection
      id="admin-entry-reports"
      title={copy.title}
      description={copy.description}
      summary={buildSectionSummary({
        active: openReportCount,
        labels: copy.summaryLabels,
        language,
        total: entryReports.items.length,
      })}
      defaultOpen={Boolean(entryReports.error) || openReportCount > 0}
    >
      {entryReportsContent}
    </AdminPersistentSection>
  );
}
