"use client";

import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/Badge";
import { useLanguage } from "@/components/LanguageProvider";
import { SurfacePanel, surfacePanelClassName } from "@/components/SurfacePanel";
import { AdminErrorDisclosure } from "@/features/admin/components/AdminErrorDisclosure";
import {
  formatContentReleaseAudienceSegment,
  formatContentReleaseLocaleMode,
  formatContentReleaseTargetStatus,
  formatContentReleaseType,
  getContentReleaseDeliverySummary,
  type AdminContentRelease,
  type ContentReleaseTargetRow,
} from "@/features/communications/lib/releases";
import type { Language } from "@/types/i18n";

import { ContentReleaseReviewForm } from "./ContentReleaseReviewForm";
import { ContentReleaseStatusBadge } from "./ContentReleaseStatusBadge";
import { DeleteContentReleaseForm } from "./DeleteContentReleaseForm";
import { SendContentReleaseForm } from "./SendContentReleaseForm";
import { SendContentReleasePreviewForm } from "./SendContentReleasePreviewForm";

const adminContentReleaseCardCopy = {
  en: {
    broadcast: "Broadcast",
    createdOn: "Created on",
    deliveryCounts: "Delivery counts",
    deliveryError: "Delivery could not complete for this release.",
    deliveryFinishedOn: "Delivery finished on",
    deliveryLog: "Delivery log",
    deliveryRequestedOn: "Delivery requested on",
    deliveryStartedOn: "Delivery started on",
    dutchCopy: "Dutch copy",
    eligibleRecipients: "Eligible recipients",
    englishCopy: "English copy",
    failed: "failed",
    hideDetails: "Hide details",
    id: "id",
    lesson: "Lesson",
    noDutchBody: "Nog geen Nederlandse tekst opgeslagen.",
    noEnglishBody: "No English body saved yet.",
    notSentYet: "Not sent yet",
    notSet: "Not set",
    processedRecipients: "Processed recipients",
    publication: "Publication",
    recipients: "recipients",
    releaseTargets: "Release targets",
    remaining: "remaining",
    sent: "Sent",
    sentOn: "Sent on",
    showDetails: "Show details",
    skipped: "skipped",
    snapshotItems: "Snapshot items",
    snapshottedItems: "Snapshotted items",
    started: "Started",
    targetDiagnostic: "Diagnostic",
    targetProviderId: "Provider ID",
    targetSegment: "Segment",
    targetTopic: "Topic",
    targetUpdated: "Provider updated",
    untitled: "Untitled release draft",
    updated: "Updated",
    updatedOn: "Updated on",
  },
  nl: {
    broadcast: "Broadcast",
    createdOn: "Aangemaakt op",
    deliveryCounts: "Leveringsaantallen",
    deliveryError: "Levering kon niet worden afgerond voor deze release.",
    deliveryFinishedOn: "Levering afgerond op",
    deliveryLog: "Leveringslog",
    deliveryRequestedOn: "Levering aangevraagd op",
    deliveryStartedOn: "Levering gestart op",
    dutchCopy: "Nederlandse tekst",
    eligibleRecipients: "Geschikte ontvangers",
    englishCopy: "Engelse tekst",
    failed: "mislukt",
    hideDetails: "Details verbergen",
    id: "id",
    lesson: "Les",
    noDutchBody: "Nog geen Nederlandse tekst opgeslagen.",
    noEnglishBody: "Nog geen Engelse tekst opgeslagen.",
    notSentYet: "Nog niet verzonden",
    notSet: "Niet ingesteld",
    processedRecipients: "Verwerkte ontvangers",
    publication: "Publicatie",
    recipients: "ontvangers",
    releaseTargets: "Releasedoelen",
    remaining: "resterend",
    sent: "Verzonden",
    sentOn: "Verzonden op",
    showDetails: "Details tonen",
    skipped: "overgeslagen",
    snapshotItems: "Snapshotitems",
    snapshottedItems: "Items in snapshot",
    started: "Gestart",
    targetDiagnostic: "Diagnose",
    targetProviderId: "Provider-ID",
    targetSegment: "Segment",
    targetTopic: "Topic",
    targetUpdated: "Provider bijgewerkt",
    untitled: "Releaseconcept zonder titel",
    updated: "Bijgewerkt",
    updatedOn: "Bijgewerkt op",
  },
} as const;

function formatContentReleaseTimestamp(
  timestamp: string | null,
  language: Language,
  emptyLabel = "Not sent yet",
) {
  if (!timestamp) {
    return emptyLabel;
  }

  return new Date(timestamp).toLocaleString(
    language === "nl" ? "nl-BE" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );
}

function getReleaseTargetStatus(target: ContentReleaseTargetRow) {
  return target.last_provider_status ?? target.status;
}

function getReleaseTargetStatusTone(
  target: ContentReleaseTargetRow,
): "danger" | "neutral" | "success" | "surface" | "warning" {
  switch (getReleaseTargetStatus(target)) {
    case "accepted":
    case "delivered":
      return "success";
    case "bounced":
    case "complained":
    case "failed":
    case "suppressed":
      return "danger";
    case "delayed":
    case "creating":
    case "pending":
    case "sending":
      return "warning";
    case "cancelled":
      return "neutral";
    default:
      return "surface";
  }
}

export function AdminContentReleaseCard({
  release,
}: {
  release: AdminContentRelease;
}) {
  const { language } = useLanguage();
  const copy = adminContentReleaseCardCopy[language];
  const deliverySummary = getContentReleaseDeliverySummary(release);
  const shouldOpenDeliveryLog =
    release.status === "queued" ||
    release.status === "sending" ||
    Boolean(release.last_delivery_error);
  let deliveryStatusLabel = (
    <span className="text-muted">
      {copy.createdOn}{" "}
      {formatContentReleaseTimestamp(
        release.created_at,
        language,
        copy.notSentYet,
      )}
    </span>
  );

  if (release.sent_at) {
    deliveryStatusLabel = (
      <span className="text-muted">
        {copy.sentOn} {formatContentReleaseTimestamp(release.sent_at, language)}
      </span>
    );
  } else if (release.delivery_started_at) {
    deliveryStatusLabel = (
      <span className="text-muted">
        {copy.started}{" "}
        {formatContentReleaseTimestamp(release.delivery_started_at, language)}
      </span>
    );
  }

  return (
    <SurfacePanel
      as="article"
      rounded="lg"
      variant="elevated"
      className="p-6 md:p-8"
    >
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ContentReleaseStatusBadge status={release.status} />
            <Badge tone="surface" size="xs">
              {formatContentReleaseType(release.release_type, language)}
            </Badge>
            <Badge tone="neutral" size="xs">
              {formatContentReleaseAudienceSegment(
                release.audience_segment,
                language,
              )}
            </Badge>
            <Badge tone="coptic" size="xs">
              {formatContentReleaseLocaleMode(release.locale_mode, language)}
            </Badge>
          </div>

          <h2 className="text-2xl font-semibold text-ink">
            {release.subject_en ?? release.subject_nl ?? copy.untitled}
          </h2>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone="surface" size="xs">
              {copy.updated}{" "}
              {formatContentReleaseTimestamp(release.updated_at, language)}
            </Badge>
            <Badge tone="surface" size="xs">
              {copy.snapshotItems}:{" "}
              {release.items.length.toLocaleString(
                language === "nl" ? "nl-BE" : "en-US",
              )}
            </Badge>
            {typeof deliverySummary.eligibleRecipientCount === "number" ? (
              <Badge tone="surface" size="xs">
                {copy.eligibleRecipients}:{" "}
                {deliverySummary.eligibleRecipientCount.toLocaleString(
                  language === "nl" ? "nl-BE" : "en-US",
                )}
              </Badge>
            ) : null}
            {typeof deliverySummary.sentCount === "number" ? (
              <Badge
                tone={deliverySummary.failedCount ? "accent" : "coptic"}
                size="xs"
              >
                {copy.sent}:{" "}
                {deliverySummary.sentCount.toLocaleString(
                  language === "nl" ? "nl-BE" : "en-US",
                )}
              </Badge>
            ) : null}
          </div>

          <div className="mt-4">
            <details
              className={surfacePanelClassName({
                rounded: "lg",
                variant: "elevated",
                className: "group p-4",
              })}
              open={shouldOpenDeliveryLog}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
                <div className="flex flex-wrap items-center gap-3">
                  <span>{copy.deliveryLog}</span>
                  {deliveryStatusLabel}
                </div>

                <div className="flex items-center gap-2 text-muted">
                  <span className="group-open:hidden">{copy.showDetails}</span>
                  <span className="hidden group-open:inline">
                    {copy.hideDetails}
                  </span>
                  <ChevronDown className="h-5 w-5 transition-transform duration-200 group-open:rotate-180" />
                </div>
              </summary>

              <div className="mt-4 space-y-2 text-sm text-muted">
                <p>
                  {copy.createdOn}{" "}
                  {formatContentReleaseTimestamp(release.created_at, language)}
                </p>
                <p>
                  {copy.updatedOn}{" "}
                  {formatContentReleaseTimestamp(release.updated_at, language)}
                </p>
                {release.delivery_requested_at ? (
                  <p>
                    {copy.deliveryRequestedOn}{" "}
                    {formatContentReleaseTimestamp(
                      release.delivery_requested_at,
                      language,
                    )}
                  </p>
                ) : null}
                {release.delivery_started_at ? (
                  <p>
                    {copy.deliveryStartedOn}{" "}
                    {formatContentReleaseTimestamp(
                      release.delivery_started_at,
                      language,
                    )}
                  </p>
                ) : null}
                {release.delivery_finished_at ? (
                  <p>
                    {copy.deliveryFinishedOn}{" "}
                    {formatContentReleaseTimestamp(
                      release.delivery_finished_at,
                      language,
                    )}
                  </p>
                ) : null}
                {release.sent_at ? (
                  <p>
                    {copy.sentOn}{" "}
                    {formatContentReleaseTimestamp(release.sent_at, language)}
                  </p>
                ) : null}
                {typeof deliverySummary.processedRecipientCount === "number" ? (
                  <p>
                    {copy.processedRecipients}:{" "}
                    {deliverySummary.processedRecipientCount.toLocaleString(
                      language === "nl" ? "nl-BE" : "en-US",
                    )}
                    {typeof deliverySummary.remainingRecipientCount === "number"
                      ? `, ${copy.remaining} ${deliverySummary.remainingRecipientCount.toLocaleString(
                          language === "nl" ? "nl-BE" : "en-US",
                        )}`
                      : ""}
                  </p>
                ) : null}
                {typeof deliverySummary.sentCount === "number" ||
                typeof deliverySummary.skippedCount === "number" ||
                typeof deliverySummary.failedCount === "number" ? (
                  <p>
                    {copy.deliveryCounts}: {copy.sent.toLowerCase()}{" "}
                    {(deliverySummary.sentCount ?? 0).toLocaleString(
                      language === "nl" ? "nl-BE" : "en-US",
                    )}
                    , {copy.skipped}{" "}
                    {(deliverySummary.skippedCount ?? 0).toLocaleString(
                      language === "nl" ? "nl-BE" : "en-US",
                    )}
                    , {copy.failed}{" "}
                    {(deliverySummary.failedCount ?? 0).toLocaleString(
                      language === "nl" ? "nl-BE" : "en-US",
                    )}
                  </p>
                ) : null}
                {deliverySummary.broadcasts?.length ? (
                  <div className="space-y-1">
                    {deliverySummary.broadcasts.map((broadcast) => (
                      <p key={broadcast.id}>
                        {copy.broadcast} {broadcast.language.toUpperCase()}:{" "}
                        {broadcast.recipientCount.toLocaleString(
                          language === "nl" ? "nl-BE" : "en-US",
                        )}{" "}
                        {copy.recipients}, {copy.id} {broadcast.id}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            </details>
          </div>
        </div>
      </div>

      {release.targets.length > 0 ? (
        <div className="mb-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {copy.releaseTargets}
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {release.targets.map((target) => (
              <div
                key={target.id}
                className={surfacePanelClassName({
                  rounded: "lg",
                  variant: "elevated",
                  className: "px-5 py-4",
                })}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="language" size="xs">
                    {target.language.toUpperCase()}
                  </Badge>
                  <Badge tone={getReleaseTargetStatusTone(target)} size="xs">
                    {formatContentReleaseTargetStatus(
                      getReleaseTargetStatus(target),
                      language,
                    )}
                  </Badge>
                  <Badge tone="surface" size="xs">
                    {target.recipient_count_snapshot.toLocaleString(
                      language === "nl" ? "nl-BE" : "en-US",
                    )}{" "}
                    {copy.recipients}
                  </Badge>
                </div>

                <div className="mt-3 space-y-1.5 text-sm leading-6 text-muted">
                  <p>
                    {copy.targetSegment}:{" "}
                    <span className="font-semibold text-ink">
                      {target.segment_id}
                    </span>
                  </p>
                  <p>
                    {copy.targetTopic}:{" "}
                    <span className="font-semibold text-ink">
                      {target.topic_id}
                    </span>
                  </p>
                  {target.provider_broadcast_id ? (
                    <p>
                      {copy.targetProviderId}:{" "}
                      <span className="font-semibold text-ink">
                        {target.provider_broadcast_id}
                      </span>
                    </p>
                  ) : null}
                  {target.provider_status_updated_at ? (
                    <p>
                      {copy.targetUpdated}:{" "}
                      {formatContentReleaseTimestamp(
                        target.provider_status_updated_at,
                        language,
                      )}
                    </p>
                  ) : null}
                  {target.last_provider_error ? (
                    <p>
                      {copy.targetDiagnostic}:{" "}
                      <span className="font-semibold text-ink">
                        {target.last_provider_error}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {release.last_delivery_error ? (
        <AdminErrorDisclosure
          className="mb-6"
          language={language}
          message={copy.deliveryError}
          technicalDetails={release.last_delivery_error}
          tone="warning"
        />
      ) : null}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div
          className={surfacePanelClassName({
            rounded: "lg",
            variant: "elevated",
            className: "p-5",
          })}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {copy.englishCopy}
          </p>
          <p className="text-sm font-semibold text-ink">
            {release.subject_en ?? copy.notSet}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
            {release.body_en ?? copy.noEnglishBody}
          </p>
        </div>

        <div
          className={surfacePanelClassName({
            rounded: "lg",
            variant: "elevated",
            className: "p-5",
          })}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {copy.dutchCopy}
          </p>
          <p className="text-sm font-semibold text-ink">
            {release.subject_nl ?? copy.notSet}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
            {release.body_nl ?? copy.noDutchBody}
          </p>
        </div>
      </div>

      <div className="mb-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {copy.snapshottedItems}
        </p>
        <div className="space-y-3">
          {release.items.map((item) => (
            <div
              key={item.id}
              className={surfacePanelClassName({
                rounded: "lg",
                variant: "elevated",
                className: "px-5 py-4",
              })}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="surface" size="xs">
                  {item.item_type === "lesson" ? copy.lesson : copy.publication}
                </Badge>
                <Badge tone="neutral" size="xs">
                  {item.item_id}
                </Badge>
              </div>
              <p className="mt-3 text-base font-semibold text-ink">
                {item.title_snapshot}
              </p>
              <p className="mt-2 text-sm text-muted">{item.url_snapshot}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <SendContentReleasePreviewForm releaseId={release.id} />
        <ContentReleaseReviewForm
          releaseId={release.id}
          status={release.status}
        />
        <DeleteContentReleaseForm
          releaseId={release.id}
          status={release.status}
        />
        <SendContentReleaseForm
          releaseId={release.id}
          status={release.status}
        />
      </div>
    </SurfacePanel>
  );
}
