import { EmptyState } from "@/components/EmptyState";
import {
  AdminDatabaseErrorState,
  formatAdminNumber,
} from "@/features/admin/components/AdminDashboardSectionShared";
import { AdminOverflowDisclosure } from "@/features/admin/components/AdminListPrimitives";
import { AdminPersistentSection } from "@/features/admin/components/AdminPersistentSection";
import type { AdminDashboardData } from "@/features/admin/lib/dashboardData";
import { splitAdminVisibleItems } from "@/features/admin/lib/listPrimitives";
import { AdminAudienceContactCard } from "@/features/communications/components/AdminAudienceContactCard";
import { SyncAudienceContactsForm } from "@/features/communications/components/SyncAudienceContactsForm";
import type { Language } from "@/types/i18n";

import { adminDashboardSectionsCopy } from "./adminDashboardSectionsCopy";

export function AdminAudienceSection({
  audience,
  language,
  showSyncForm = true,
}: {
  audience: AdminDashboardData["audience"];
  language: Language;
  showSyncForm?: boolean;
}) {
  const copy = adminDashboardSectionsCopy[language].audience;
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
        <AdminDatabaseErrorState
          details={audience.error}
          language={language}
          message={copy.dbError}
        />
      );
    }

    if (audience.items.length === 0) {
      return (
        <EmptyState
          title={copy.emptyTitle}
          description={copy.emptyDescription}
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
            label={copy.overflowLabel}
            pluralLabel={copy.overflowPluralLabel}
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
      title={copy.title}
      description={copy.description}
      summary={
        metrics.totalAudienceContactsCount === 0
          ? copy.noSummary
          : `${formatAdminNumber(
              metrics.subscribedAudienceContactsCount,
              language,
            )} ${copy.reachable} · ${formatAdminNumber(
              metrics.totalAudienceContactsCount,
              language,
            )} ${copy.summaryTotal}`
      }
      defaultOpen={defaultOpen}
    >
      {audienceContent}
    </AdminPersistentSection>
  );
}
