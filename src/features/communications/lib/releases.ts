import {
  getMailFooterLines,
  mailBrand,
  mailBrandColors,
} from "@/lib/communications/mailBrand";
import type { Language } from "@/types/i18n";
import type { Json, Tables } from "@/types/supabase";

export type ContentReleaseRow = Tables<"content_releases">;
export type ContentReleaseItemRow = Tables<"content_release_items">;
export type ContentReleaseTargetRow = Tables<"content_release_targets">;

export type ContentReleaseCandidate = {
  id: string;
  itemId: string;
  itemType: ContentReleaseItemRow["item_type"];
  summaryEn?: string;
  summaryNl?: string;
  title: string;
  url: string;
};

export type AdminContentRelease = ContentReleaseRow & {
  items: ContentReleaseItemRow[];
  targets: ContentReleaseTargetRow[];
};

type ContentReleaseDeliverySummary = {
  broadcasts?: Array<{
    id: string;
    language: Language;
    recipientCount: number;
    segmentId: string;
    subject: string;
    topicId: string;
  }>;
  eligibleRecipientCount?: number;
  failedCount?: number;
  processedRecipientCount?: number;
  remainingRecipientCount?: number;
  sentCount?: number;
  skippedCount?: number;
};

export const CONTENT_RELEASE_AUDIENCE_SEGMENTS = [
  "lessons",
  "books",
  "general",
] as const satisfies readonly ContentReleaseRow["audience_segment"][];

export const CONTENT_RELEASE_LOCALE_MODES = [
  "localized",
  "en_only",
  "nl_only",
] as const satisfies readonly ContentReleaseRow["locale_mode"][];

export const CONTENT_RELEASE_EDITABLE_STATUSES = [
  "draft",
  "approved",
  "cancelled",
] as const satisfies readonly ContentReleaseRow["status"][];

export const CONTENT_RELEASE_DELETABLE_STATUSES = [
  "draft",
  "cancelled",
] as const satisfies readonly ContentReleaseRow["status"][];

/**
 * Collapses the selected item types into the release type stored on the parent
 * release row.
 */
export function deriveContentReleaseType(
  itemTypes: ContentReleaseItemRow["item_type"][],
): ContentReleaseRow["release_type"] | null {
  const uniqueItemTypes = Array.from(new Set(itemTypes));

  if (uniqueItemTypes.length === 0) {
    return null;
  }

  if (uniqueItemTypes.length > 1) {
    return "mixed";
  }

  return uniqueItemTypes[0] === "lesson" ? "lesson" : "publication";
}

/**
 * Narrows audience-segment form values before they are persisted on a release.
 */
export function isContentReleaseAudienceSegment(
  value: string,
): value is ContentReleaseRow["audience_segment"] {
  return CONTENT_RELEASE_AUDIENCE_SEGMENTS.includes(
    value as ContentReleaseRow["audience_segment"],
  );
}

/**
 * Narrows locale-mode form values before they are persisted on a release.
 */
export function isContentReleaseLocaleMode(
  value: string,
): value is ContentReleaseRow["locale_mode"] {
  return CONTENT_RELEASE_LOCALE_MODES.includes(
    value as ContentReleaseRow["locale_mode"],
  );
}

/**
 * Identifies statuses that can still be edited from the admin workspace.
 */
export function isContentReleaseEditableStatus(
  value: string,
): value is (typeof CONTENT_RELEASE_EDITABLE_STATUSES)[number] {
  return CONTENT_RELEASE_EDITABLE_STATUSES.includes(
    value as (typeof CONTENT_RELEASE_EDITABLE_STATUSES)[number],
  );
}

/**
 * Identifies statuses that still allow the whole release draft to be deleted.
 */
export function isContentReleaseDeletableStatus(
  value: string,
): value is (typeof CONTENT_RELEASE_DELETABLE_STATUSES)[number] {
  return CONTENT_RELEASE_DELETABLE_STATUSES.includes(
    value as (typeof CONTENT_RELEASE_DELETABLE_STATUSES)[number],
  );
}

/**
 * Formats the stored release type for admin labels and status surfaces.
 */
export function formatContentReleaseType(
  releaseType: ContentReleaseRow["release_type"],
  language: Language = "en",
) {
  if (language === "nl") {
    switch (releaseType) {
      case "lesson":
        return "Lesrelease";
      case "publication":
        return "Publicatierelease";
      case "mixed":
        return "Gemengde release";
      default:
        return releaseType;
    }
  }

  switch (releaseType) {
    case "lesson":
      return "Lesson release";
    case "publication":
      return "Publication release";
    case "mixed":
      return "Mixed release";
    default:
      return releaseType;
  }
}

/**
 * Formats the stored release status for admin labels and status surfaces.
 */
export function formatContentReleaseStatus(
  status: ContentReleaseRow["status"],
  language: Language = "en",
) {
  if (language === "nl") {
    switch (status) {
      case "draft":
        return "Concept";
      case "approved":
        return "Goedgekeurd";
      case "queued":
        return "In wachtrij";
      case "sending":
        return "Wordt verzonden";
      case "sent":
        return "Verzonden";
      case "partially_failed":
        return "Gedeeltelijk mislukt";
      case "cancelled":
        return "Geannuleerd";
      default:
        return status;
    }
  }

  switch (status) {
    case "draft":
      return "Draft";
    case "approved":
      return "Approved";
    case "queued":
      return "Queued";
    case "sending":
      return "Sending";
    case "sent":
      return "Sent";
    case "partially_failed":
      return "Partially failed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

/**
 * Formats the persisted release target lifecycle for admin operations panels.
 */
export function formatContentReleaseTargetStatus(
  status:
    | ContentReleaseTargetRow["last_provider_status"]
    | ContentReleaseTargetRow["status"],
  language: Language = "en",
) {
  if (language === "nl") {
    switch (status) {
      case "accepted":
        return "Geaccepteerd";
      case "bounced":
        return "Bounce";
      case "cancelled":
        return "Geannuleerd";
      case "complained":
        return "Klacht";
      case "created":
        return "Aangemaakt";
      case "creating":
        return "Wordt aangemaakt";
      case "delayed":
        return "Vertraagd";
      case "delivered":
        return "Bezorgd";
      case "failed":
        return "Mislukt";
      case "pending":
        return "Wachtend";
      case "sending":
        return "Wordt verzonden";
      case "suppressed":
        return "Onderdrukt";
      default:
        return status ?? "Onbekend";
    }
  }

  switch (status) {
    case "accepted":
      return "Accepted";
    case "bounced":
      return "Bounced";
    case "cancelled":
      return "Cancelled";
    case "complained":
      return "Complaint";
    case "created":
      return "Created";
    case "creating":
      return "Creating";
    case "delayed":
      return "Delayed";
    case "delivered":
      return "Delivered";
    case "failed":
      return "Failed";
    case "pending":
      return "Pending";
    case "sending":
      return "Sending";
    case "suppressed":
      return "Suppressed";
    default:
      return status ?? "Unknown";
  }
}

/**
 * Formats the saved audience segment for admin-facing copy.
 */
export function formatContentReleaseAudienceSegment(
  segment: ContentReleaseRow["audience_segment"],
  language: Language = "en",
) {
  if (language === "nl") {
    switch (segment) {
      case "lessons":
        return "Abonnees op lessen";
      case "books":
        return "Abonnees op boeken";
      case "general":
        return "Algemene updates";
      default:
        return segment;
    }
  }

  switch (segment) {
    case "lessons":
      return "Lesson subscribers";
    case "books":
      return "Book subscribers";
    case "general":
      return "General updates";
    default:
      return segment;
  }
}

/**
 * Formats the stored locale mode for admin-facing copy.
 */
export function formatContentReleaseLocaleMode(
  localeMode: ContentReleaseRow["locale_mode"],
  language: Language = "en",
) {
  if (language === "nl") {
    switch (localeMode) {
      case "localized":
        return "Gelokaliseerd EN + NL";
      case "en_only":
        return "Alleen Engels";
      case "nl_only":
        return "Alleen Nederlands";
      default:
        return localeMode;
    }
  }

  switch (localeMode) {
    case "localized":
      return "Localized EN + NL";
    case "en_only":
      return "English only";
    case "nl_only":
      return "Dutch only";
    default:
      return localeMode;
  }
}

/**
 * Orders release rows by operational urgency so active deliveries and drafts
 * surface above historical items in the admin workspace.
 */
export function compareContentReleasePriority(
  left: AdminContentRelease,
  right: AdminContentRelease,
) {
  const statusPriority = {
    queued: 0,
    sending: 1,
    partially_failed: 2,
    approved: 3,
    draft: 4,
    sent: 5,
    cancelled: 6,
  } as const;

  const byStatus = statusPriority[left.status] - statusPriority[right.status];
  if (byStatus !== 0) {
    return byStatus;
  }

  return (
    new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
  );
}

/**
 * Parses the optional delivery-summary JSON into the typed counts and broadcast
 * metadata shown in admin status cards.
 */
export function getContentReleaseDeliverySummary(
  release: Pick<ContentReleaseRow, "delivery_summary">,
): ContentReleaseDeliverySummary {
  const summary = asObject(release.delivery_summary);
  if (!summary) {
    return {};
  }
  const broadcasts = getBroadcastSummaryEntries(summary);

  return {
    ...(broadcasts ? { broadcasts } : {}),
    eligibleRecipientCount: asOptionalNumber(summary.eligible_recipient_count),
    failedCount: asOptionalNumber(summary.failed_count),
    processedRecipientCount: asOptionalNumber(
      summary.processed_recipient_count,
    ),
    remainingRecipientCount: asOptionalNumber(
      summary.remaining_recipient_count,
    ),
    sentCount: asOptionalNumber(summary.sent_count),
    skippedCount: asOptionalNumber(summary.skipped_count),
  };
}

/**
 * Resolves which language variant should be delivered to a recipient under the
 * release locale mode and their preferred locale.
 */
function getContentReleaseDeliveryLanguage(
  release: Pick<ContentReleaseRow, "locale_mode">,
  preferredLocale: Language,
): Language {
  if (release.locale_mode === "en_only") {
    return "en";
  }

  if (release.locale_mode === "nl_only") {
    return "nl";
  }

  return preferredLocale === "nl" ? "nl" : "en";
}

/**
 * Selects the localized subject/body pair used to render an outbound release
 * email for one recipient.
 */
export function getContentReleaseCopyForLocale(
  release: Pick<
    ContentReleaseRow,
    "body_en" | "body_nl" | "locale_mode" | "subject_en" | "subject_nl"
  >,
  preferredLocale: Language,
) {
  const deliveryLanguage = getContentReleaseDeliveryLanguage(
    release,
    preferredLocale,
  );

  return {
    body: deliveryLanguage === "nl" ? release.body_nl : release.body_en,
    language: deliveryLanguage,
    subject:
      deliveryLanguage === "nl" ? release.subject_nl : release.subject_en,
  };
}

/**
 * Builds the plain-text fallback body for release emails, including the item
 * list and shared branded footer.
 */
export function buildContentReleaseEmailText(options: {
  body: string;
  items: Pick<ContentReleaseItemRow, "title_snapshot" | "url_snapshot">[];
  language: Language;
}) {
  const intro = options.body.trim();
  const itemsHeading =
    options.language === "nl" ? "In deze release:" : "In this release:";
  const itemsList = options.items
    .map((item) => `- ${item.title_snapshot}: ${item.url_snapshot}`)
    .join("\n");

  return [
    intro,
    "",
    itemsHeading,
    itemsList,
    "",
    ...getMailFooterLines(options.language),
  ].join("\n");
}

/**
 * Builds the branded HTML variant used for content release emails.
 */
export function buildContentReleaseEmailHtml(options: {
  body: string;
  items: Pick<ContentReleaseItemRow, "title_snapshot" | "url_snapshot">[];
  language: Language;
  subject: string;
}) {
  const intro = escapeHtml(options.body.trim()).replace(/\n/g, "<br />");
  const itemsHeading =
    options.language === "nl" ? "In deze release" : "In this release";
  const footer = getMailFooterLines(options.language).map(escapeHtml);
  const introLabel =
    options.language === "nl"
      ? "Nieuwe updates van Coptic Compass"
      : "New updates from Coptic Compass";
  const colors = mailBrandColors;

  const itemsHtml = options.items
    .map(
      (item) => `
        <li style="margin:0 0 14px;">
          <a href="${escapeHtml(item.url_snapshot)}" style="color:${colors.coptic};text-decoration:none;font-weight:700;">
            ${escapeHtml(item.title_snapshot)}
          </a>
          <div style="margin-top:4px;font-size:13px;color:${colors.muted};">${escapeHtml(item.url_snapshot)}</div>
        </li>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;background:${colors.paper};padding:24px 12px;font-family:Aptos,Segoe UI,Helvetica Neue,Arial,sans-serif;color:${colors.ink};">
    <div style="max-width:640px;margin:0 auto;background:${colors.surface};border:1px solid ${colors.line};border-radius:10px;overflow:hidden;">
      <div style="height:6px;background:${colors.gold};"></div>
      <div style="padding:28px 32px;background:${colors.surface};border-bottom:1px solid ${colors.line};">
        <div style="margin-bottom:14px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${colors.goldStrong};font-weight:700;">${escapeHtml(
          mailBrand.brandName,
        )} • ${escapeHtml(mailBrand.descriptor)}</div>
        <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${colors.coptic};font-weight:700;">${escapeHtml(
          introLabel,
        )}</div>
        <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;color:${colors.ink};">${escapeHtml(
          options.subject,
        )}</h1>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:${colors.ink};">${intro}</p>
        <h2 style="margin:0 0 14px;font-size:18px;line-height:1.4;color:${colors.ink};">${escapeHtml(
          itemsHeading,
        )}</h2>
        <ul style="margin:0;padding-left:20px;">${itemsHtml}</ul>
      </div>
      <div style="padding:24px 32px;border-top:1px solid ${colors.line};background:${colors.elevated};font-size:13px;line-height:1.7;color:${colors.muted};">
        <div>${footer[0]}</div>
        <div style="font-weight:700;color:${colors.ink};">${footer[1]}</div>
        <div>${footer[2]}</div>
        <div style="margin-top:8px;"><a href="${mailBrand.liveUrl}" style="color:${colors.coptic};text-decoration:none;">${footer[3]}</a></div>
      </div>
    </div>
  </body>
</html>`;
}

function asObject(
  value: Json | undefined,
): Record<string, Json | undefined> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, Json | undefined>;
}

function asOptionalNumber(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function asOptionalString(value: Json | undefined) {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function getBroadcastSummaryEntries(summary: Record<string, Json | undefined>) {
  const broadcasts = asObject(summary.broadcasts);
  if (!broadcasts) {
    return undefined;
  }

  const entries = (["en", "nl"] as const)
    .map((language) => {
      const entry = asObject(broadcasts[language]);
      if (!entry) {
        return null;
      }

      const id = asOptionalString(entry.id);
      const segmentId = asOptionalString(entry.segment_id);
      const subject = asOptionalString(entry.subject);
      const topicId = asOptionalString(entry.topic_id);
      const recipientCount = asOptionalNumber(entry.recipient_count);

      if (
        !id ||
        !segmentId ||
        !subject ||
        !topicId ||
        recipientCount === undefined
      ) {
        return null;
      }

      return {
        id,
        language,
        recipientCount,
        segmentId,
        subject,
        topicId,
      };
    })
    .filter((entry) => entry !== null);

  return entries.length > 0 ? entries : undefined;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
