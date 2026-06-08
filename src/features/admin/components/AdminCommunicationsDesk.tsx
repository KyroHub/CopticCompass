import { PageHeader } from "@/components/PageHeader";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import { adminSummaryPanelClassName } from "@/features/admin/components/adminControlStyles";
import { formatAdminNumber } from "@/features/admin/components/AdminDashboardSectionShared";
import type {
  AdminDashboardData,
  AdminWorkspaceOverview,
} from "@/features/admin/lib/dashboardData";
import { CreateContentReleaseForm } from "@/features/communications/components/CreateContentReleaseForm";
import { SyncAudienceContactsForm } from "@/features/communications/components/SyncAudienceContactsForm";
import { cx } from "@/lib/classes";
import type { Language } from "@/types/i18n";

import { adminDashboardSectionsCopy } from "./adminDashboardSectionsCopy";

export function AdminCommunicationsDesk({
  audience,
  contentReleases,
  language,
  overview,
}: {
  audience: AdminDashboardData["audience"];
  contentReleases: AdminDashboardData["contentReleases"];
  language: Language;
  overview: AdminWorkspaceOverview;
}) {
  const copy = adminDashboardSectionsCopy[language].communicationsDesk;
  const totalCandidates =
    contentReleases.lessonReleaseCandidates.length +
    contentReleases.publicationReleaseCandidates.length;
  const reachableAudienceCount =
    audience.metrics.subscribedAudienceContactsCount;

  return (
    <section className={adminSummaryPanelClassName()}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <PageHeader
            as="h2"
            align="left"
            size="section"
            title={copy.title}
            description={copy.description}
          />
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {copy.activeReleases}:{" "}
          {formatAdminNumber(overview.actionableReleaseCount, language)}
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div
          className={surfacePanelClassName({
            rounded: "lg",
            variant: "subtle",
            className: "p-3",
          })}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {copy.reachableAudienceLabel}
          </p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {formatAdminNumber(reachableAudienceCount, language)}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            {copy.reachableAudienceDescription}
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
            {copy.syncHealthLabel}
          </p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {formatAdminNumber(audience.metrics.resendSyncErrorCount, language)}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            {copy.syncHealthDescription}
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
            {copy.draftInputsLabel}
          </p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {formatAdminNumber(totalCandidates, language)}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            {copy.draftInputsDescription}
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
            {copy.inQueueLabel}
          </p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {formatAdminNumber(
              contentReleases.items.filter(
                (release) =>
                  release.status === "queued" || release.status === "sending",
              ).length,
              language,
            )}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            {copy.inQueueDescription}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <CreateContentReleaseForm
          lessonCandidates={contentReleases.lessonReleaseCandidates}
          publicationCandidates={contentReleases.publicationReleaseCandidates}
        />

        <div
          className={surfacePanelClassName({
            rounded: "lg",
            variant: "elevated",
            className: "p-5",
          })}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            <span>
              {copy.synced}:{" "}
              {formatAdminNumber(
                audience.metrics.resendSyncedAudienceCount,
                language,
              )}
            </span>
            <span
              className={cx(
                audience.metrics.resendSyncErrorCount > 0 && "text-danger",
              )}
            >
              {copy.syncErrors}:{" "}
              {formatAdminNumber(
                audience.metrics.resendSyncErrorCount,
                language,
              )}
            </span>
          </div>

          <h3 className="mt-4 text-lg font-semibold text-ink">
            {copy.audienceSyncTitle}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            {copy.audienceSyncDescription}
          </p>

          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div
                className={surfacePanelClassName({
                  rounded: "lg",
                  variant: "elevated",
                  className: "p-4",
                })}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  {copy.lessons}
                </p>
                <p className="mt-2 text-lg font-semibold text-ink">
                  {formatAdminNumber(
                    audience.metrics.lessonAudienceCount,
                    language,
                  )}
                </p>
              </div>
              <div
                className={surfacePanelClassName({
                  rounded: "lg",
                  variant: "elevated",
                  className: "p-4",
                })}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  {copy.booksGeneral}
                </p>
                <p className="mt-2 text-lg font-semibold text-ink">
                  {formatAdminNumber(
                    audience.metrics.bookAudienceCount +
                      audience.metrics.generalAudienceCount,
                    language,
                  )}
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
