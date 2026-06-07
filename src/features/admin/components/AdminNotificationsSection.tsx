import { EmptyState } from "@/components/EmptyState";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import {
  AdminDatabaseErrorState,
  formatAdminNumber,
} from "@/features/admin/components/AdminDashboardSectionShared";
import { AdminOverflowDisclosure } from "@/features/admin/components/AdminListPrimitives";
import { AdminPersistentSection } from "@/features/admin/components/AdminPersistentSection";
import type { AdminDashboardData } from "@/features/admin/lib/dashboardData";
import { splitAdminVisibleItems } from "@/features/admin/lib/listPrimitives";
import { AdminNotificationEventCard } from "@/features/notifications/components/AdminNotificationEventCard";
import { cx } from "@/lib/classes";
import type { Language } from "@/types/i18n";

import { adminDashboardSectionsCopy } from "./adminDashboardSectionsCopy";

export function AdminNotificationsSection({
  language,
  notifications,
}: {
  language: Language;
  notifications: AdminDashboardData["notifications"];
}) {
  const copy = adminDashboardSectionsCopy[language].notifications;
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
        <AdminDatabaseErrorState
          details={notifications.error}
          language={language}
          message={copy.dbError}
        />
      );
    }

    if (notifications.items.length === 0) {
      return (
        <EmptyState
          title={copy.emptyTitle}
          description={copy.emptyDescription}
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span
              className={cx(
                "text-xs font-semibold uppercase tracking-[0.16em] text-muted",
                attentionNotifications.length > 0 && "text-danger",
              )}
            >
              {copy.attentionLabel}:{" "}
              {formatAdminNumber(attentionNotifications.length, language)}
            </span>
            <p className="text-sm text-muted">{copy.attentionDescription}</p>
          </div>

          {attentionNotifications.length === 0 ? (
            <div
              className={surfacePanelClassName({
                rounded: "lg",
                variant: "elevated",
                className: "px-5 py-4 text-sm leading-7 text-muted",
              })}
            >
              {copy.emptyIssues}
            </div>
          ) : (
            <>
              {visibleAttentionNotifications.map((event) => (
                <AdminNotificationEventCard key={event.id} event={event} />
              ))}

              {overflowAttentionNotifications.length > 0 ? (
                <AdminOverflowDisclosure
                  count={overflowAttentionNotifications.length}
                  label={copy.notificationOverflowLabel}
                  pluralLabel={copy.notificationOverflowPluralLabel}
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              {copy.historyLabel}:{" "}
              {formatAdminNumber(historyNotifications.length, language)}
            </span>
            <p className="text-sm text-muted">{copy.historyDescription}</p>
          </div>

          {historyNotifications.length === 0 ? (
            <div
              className={surfacePanelClassName({
                rounded: "lg",
                variant: "elevated",
                className:
                  "border-dashed px-5 py-4 text-sm leading-7 text-muted",
              })}
            >
              {copy.emptyHistory}
            </div>
          ) : (
            <>
              {visibleHistoryNotifications.map((event) => (
                <AdminNotificationEventCard key={event.id} event={event} />
              ))}

              {overflowHistoryNotifications.length > 0 ? (
                <AdminOverflowDisclosure
                  count={overflowHistoryNotifications.length}
                  label={copy.historyOverflowLabel}
                  pluralLabel={copy.historyOverflowPluralLabel}
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
      title={copy.title}
      description={copy.description}
      summary={
        metrics.recentNotificationCount === 0
          ? copy.noSummary
          : `${formatAdminNumber(metrics.failedNotificationCount, language)} ${copy.failed.toLowerCase()} · ${formatAdminNumber(
              metrics.sentNotificationCount,
              language,
            )} ${copy.sentInRecentLog}`
      }
      defaultOpen={defaultOpen}
    >
      {notificationsContent}
    </AdminPersistentSection>
  );
}
