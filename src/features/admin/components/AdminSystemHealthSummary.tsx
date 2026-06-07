import { PageHeader } from "@/components/PageHeader";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import { adminSummaryPanelClassName } from "@/features/admin/components/adminControlStyles";
import { formatAdminNumber } from "@/features/admin/components/AdminDashboardSectionShared";
import type {
  AdminDashboardData,
  AdminWorkspaceOverview,
} from "@/features/admin/lib/dashboardData";
import { cx } from "@/lib/classes";
import type { Language } from "@/types/i18n";

import { adminDashboardSectionsCopy } from "./adminDashboardSectionsCopy";

export function AdminSystemHealthSummary({
  language,
  overview,
  notifications,
}: {
  language: Language;
  overview: AdminWorkspaceOverview;
  notifications: AdminDashboardData["notifications"];
}) {
  const copy = adminDashboardSectionsCopy[language].systemHealth;
  const queuedNotificationCount = notifications.items.filter(
    (event) => event.status === "queued",
  ).length;

  return (
    <section className={adminSummaryPanelClassName()}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <PageHeader
            as="h2"
            align="left"
            size="section"
            title={
              overview.failedNotificationCount > 0
                ? `${formatAdminNumber(
                    overview.failedNotificationCount,
                    language,
                  )} ${
                    overview.failedNotificationCount === 1
                      ? copy.issueSingular
                      : copy.issuePlural
                  }`
                : copy.steadyTitle
            }
            description={copy.description}
          />
        </div>

        <p
          className={cx(
            "text-xs font-semibold uppercase tracking-[0.18em] text-muted",
            overview.failedNotificationCount > 0 && "text-danger",
          )}
        >
          {copy.failedNotifications}:{" "}
          {formatAdminNumber(overview.failedNotificationCount, language)}
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div
          className={surfacePanelClassName({
            rounded: "lg",
            variant: "subtle",
            className: "p-3",
          })}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {copy.failedLabel}
          </p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {formatAdminNumber(
              notifications.metrics.failedNotificationCount,
              language,
            )}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            {copy.failedDescription}
          </p>
        </div>

        <div
          className={surfacePanelClassName({
            rounded: "lg",
            variant: "subtle",
            className: "p-3",
          })}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {copy.queuedLabel}
          </p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {formatAdminNumber(queuedNotificationCount, language)}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            {copy.queuedDescription}
          </p>
        </div>

        <div
          className={surfacePanelClassName({
            rounded: "lg",
            variant: "subtle",
            className: "p-3",
          })}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {copy.recentSentLabel}
          </p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {formatAdminNumber(
              notifications.metrics.sentNotificationCount,
              language,
            )}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            {copy.recentSentDescription}
          </p>
        </div>
      </div>
    </section>
  );
}
