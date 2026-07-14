import { PageHeader } from "@/components/PageHeader";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import { adminSummaryPanelClassName } from "@/features/admin/components/adminControlStyles";
import { formatAdminNumber } from "@/features/admin/components/AdminDashboardSectionShared";
import type {
  AdminDashboardData,
  AdminWorkspaceOverview,
} from "@/features/admin/lib/dashboardData";
import { formatLocalizedNotificationEventStatus } from "@/features/notifications/lib/notifications";
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
  const { operations } = notifications;
  const queuedNotificationCount =
    notifications.metrics.queuedNotificationCount +
    notifications.metrics.delayedNotificationCount;
  const systemIssueCount =
    overview.failedNotificationCount + operations.operationalAlerts.length;
  const queueStatusMetrics = [
    {
      label: copy.queuedLabel,
      value: operations.queuedEmailJobCount,
    },
    {
      label: copy.processingLabel,
      value: operations.processingEmailJobCount,
    },
    {
      label: copy.nextRetryLabel,
      value: operations.retryScheduledEmailJobCount,
    },
    {
      label: copy.failedLabel,
      value: operations.failedEmailJobCount,
    },
    {
      label: copy.deadLetterLabel,
      value: operations.deadLetterEmailJobCount,
    },
    {
      label: copy.processingExpiredLabel,
      value: operations.expiredProcessingEmailJobCount,
    },
  ];
  const timestampLocale = language === "nl" ? "nl-BE" : "en-US";
  const formatOptionalTimestamp = (timestamp: string | null) =>
    timestamp
      ? new Date(timestamp).toLocaleString(timestampLocale, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : copy.noneLabel;
  const formatNotificationSignal = (
    timestamp: string | null,
    status: typeof operations.latestSignupNotificationStatus,
  ) => {
    if (!timestamp) {
      return copy.noneLabel;
    }

    const formattedTimestamp = formatOptionalTimestamp(timestamp);
    return status
      ? `${formatLocalizedNotificationEventStatus(
          status,
          language,
        )} · ${formattedTimestamp}`
      : formattedTimestamp;
  };
  const notificationHealthSignals = [
    {
      description: copy.lastWorkerSuccessDescription,
      label: copy.lastWorkerSuccessLabel,
      value: formatOptionalTimestamp(operations.latestAcceptedEmailJobAt),
    },
    {
      description: copy.latestSignupAlertDescription,
      label: copy.latestSignupAlertLabel,
      value: formatNotificationSignal(
        operations.latestSignupNotificationAt,
        operations.latestSignupNotificationStatus,
      ),
    },
    {
      description: copy.latestExerciseAlertDescription,
      label: copy.latestExerciseAlertLabel,
      value: formatNotificationSignal(
        operations.latestExerciseSubmissionNotificationAt,
        operations.latestExerciseSubmissionNotificationStatus,
      ),
    },
    {
      description: copy.missingSignupAlertsDescription,
      label: copy.missingSignupAlertsLabel,
      value: formatAdminNumber(
        operations.recentSignupMissingNotificationCount,
        language,
      ),
    },
  ];

  return (
    <section className={adminSummaryPanelClassName()}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <PageHeader
            as="h2"
            align="left"
            size="section"
            title={
              systemIssueCount > 0
                ? `${formatAdminNumber(systemIssueCount, language)} ${
                    systemIssueCount === 1
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
            systemIssueCount > 0 && "text-danger",
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

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <div
          className={surfacePanelClassName({
            rounded: "lg",
            variant: "subtle",
            className: "p-4",
          })}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                {copy.queueOperationsLabel}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {copy.queueOperationsDescription}
              </p>
            </div>
            <p className="text-xs leading-5 text-muted">
              {copy.oldestEligibleLabel}:{" "}
              <span className="font-semibold text-ink">
                {formatOptionalTimestamp(operations.oldestEligibleEmailJobAt)}
              </span>
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {queueStatusMetrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-lg border border-line bg-elevated px-3 py-2"
              >
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">
                  {metric.label}
                </p>
                <p className="mt-1 text-lg font-semibold text-ink">
                  {formatAdminNumber(metric.value, language)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-2 text-xs leading-5 text-muted sm:grid-cols-2">
            <p>
              {copy.nextRetryLabel}:{" "}
              <span className="font-semibold text-ink">
                {formatOptionalTimestamp(operations.nextRetryEmailJobAt)}
              </span>
            </p>
            <p>
              {copy.receivedWebhooksLabel}:{" "}
              <span className="font-semibold text-ink">
                {formatAdminNumber(
                  operations.receivedWebhookEventCount,
                  language,
                )}
              </span>
              {operations.oldestReceivedWebhookAt
                ? ` · ${formatOptionalTimestamp(
                    operations.oldestReceivedWebhookAt,
                  )}`
                : ""}
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-line bg-elevated px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {copy.deliverySignalsLabel}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              {copy.deliverySignalsDescription}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {notificationHealthSignals.map((signal) => (
                <div
                  key={signal.label}
                  className="rounded-lg border border-line bg-canvas px-3 py-2"
                >
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">
                    {signal.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {signal.value}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {signal.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className={surfacePanelClassName({
            rounded: "lg",
            variant: "subtle",
            className: "p-4",
          })}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {copy.alertsTitle}
          </p>
          <div className="mt-3 space-y-3">
            {operations.operationalAlerts.length === 0 ? (
              <p className="text-sm leading-6 text-muted">{copy.noAlerts}</p>
            ) : (
              operations.operationalAlerts.map((alert) => {
                const alertCopy = copy.operationalAlertDetails[alert.id];

                return (
                  <div
                    key={alert.id}
                    className={cx(
                      "rounded-lg border px-3 py-2 text-sm leading-6",
                      alert.tone === "danger"
                        ? "border-danger/20 bg-danger/5 text-danger"
                        : "border-line bg-elevated text-muted",
                    )}
                  >
                    <p className="font-semibold text-ink">{alertCopy.label}</p>
                    <p>{alertCopy.detail}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
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
            {copy.webhookFailuresLabel}
          </p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {formatAdminNumber(operations.failedWebhookEventCount, language)}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            {copy.webhookFailuresDescription}
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
            {copy.activeSuppressionsLabel}
          </p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {formatAdminNumber(operations.activeSuppressionCount, language)}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            {copy.activeSuppressionsDescription}
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
            {copy.staleReleasesLabel}
          </p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {formatAdminNumber(operations.staleContentReleaseCount, language)}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            {copy.queueOperationsDescription}
          </p>
        </div>
      </div>
    </section>
  );
}
