import {
  escapeMailHtml,
  getMailFooterLines,
  getMarketingUnsubscribeLines,
  mailBrand,
  mailBrandColors,
  resendUnsubscribeUrlPlaceholder,
} from "./mailRendering.ts";

export type Language = "en" | "nl";

export type ContentReleaseRecord = {
  audience_segment: "books" | "general" | "lessons";
  body_en: string | null;
  body_nl: string | null;
  delivery_cursor: string | null;
  delivery_summary: Record<string, unknown> | null;
  id: string;
  last_delivery_error: string | null;
  locale_mode: "en_only" | "localized" | "nl_only";
  release_type: "lesson" | "mixed" | "publication";
  status:
    | "approved"
    | "cancelled"
    | "draft"
    | "partially_failed"
    | "queued"
    | "sending"
    | "sent";
  subject_en: string | null;
  subject_nl: string | null;
};

export type ContentReleaseTargetRecord = {
  accepted_at: string | null;
  attempt_count: number;
  cancelled_at: string | null;
  created_at: string;
  created_provider_at: string | null;
  creating_started_at: string | null;
  failed_at: string | null;
  id: string;
  language: Language;
  last_error: string | null;
  next_attempt_at: string;
  provider_broadcast_id: string | null;
  recipient_count_snapshot: number;
  release_id: string;
  segment_id: string;
  sending_started_at: string | null;
  status:
    | "accepted"
    | "cancelled"
    | "created"
    | "creating"
    | "failed"
    | "pending"
    | "sending";
  subject_snapshot: string;
  topic_id: string;
  updated_at: string;
};

export type ContentReleaseItemRecord = {
  item_id: string;
  item_type: "lesson" | "publication";
  title_snapshot: string;
  url_snapshot: string;
};

export type ContentReleaseDeliverySummary = {
  broadcasts?: Partial<Record<Language, ContentReleaseBroadcastDelivery>>;
  eligible_recipient_count: number;
  failed_count: number;
  item_count: number;
  processed_recipient_count: number;
  remaining_recipient_count: number;
  sent_count: number;
  skipped_count: number;
};

export type ContentReleaseBroadcastDelivery = {
  id: string;
  recipient_count: number;
  segment_id: string;
  status: "sent";
  subject: string;
  topic_id: string;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function readSummaryCount(
  summary: Record<string, unknown> | null,
  key: keyof ContentReleaseDeliverySummary,
) {
  return asOptionalNumber(summary?.[key]) ?? 0;
}

/**
 * Validates the raw edge-function invocation payload and extracts the release id
 * needed to resume or start delivery work.
 */
export function parseContentReleaseInvocationPayload(payload: unknown) {
  const data = asObject(payload);
  const releaseId = asOptionalString(data?.releaseId);

  if (!releaseId) {
    return null;
  }

  return { releaseId };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getContentReleaseDeliveryLanguage(
  release: Pick<ContentReleaseRecord, "locale_mode">,
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
 * Resolves the effective subject/body pair for a recipient based on the
 * release locale mode and the recipient's preferred language.
 */
export function getContentReleaseCopyForLocale(
  release: Pick<
    ContentReleaseRecord,
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
 * Builds the plain-text variant of a content release email, keeping the item
 * listing and branded footer consistent with the HTML version.
 */
export function buildContentReleaseEmailText(options: {
  body: string;
  includeMarketingFooter?: boolean;
  items: Pick<ContentReleaseItemRecord, "title_snapshot" | "url_snapshot">[];
  language: Language;
}) {
  const intro = options.body.trim();
  const itemsHeading =
    options.language === "nl" ? "In deze release:" : "In this release:";
  const itemsList = options.items
    .map((item) => `- ${item.title_snapshot}: ${item.url_snapshot}`)
    .join("\n");
  const footerLines = getMailFooterLines(options.language);
  const unsubscribeLines = options.includeMarketingFooter
    ? ["", ...getMarketingUnsubscribeLines(options.language)]
    : [];

  return [
    intro,
    "",
    itemsHeading,
    itemsList,
    "",
    ...footerLines,
    ...unsubscribeLines,
  ].join("\n");
}

/**
 * Builds the HTML variant of a content release email.
 * All dynamic content is escaped before interpolation so release copy and item
 * snapshots can be rendered safely inside the email template.
 */
export function buildContentReleaseEmailHtml(options: {
  body: string;
  includeMarketingFooter?: boolean;
  items: Pick<ContentReleaseItemRecord, "title_snapshot" | "url_snapshot">[];
  language: Language;
  subject: string;
}) {
  const colors = mailBrandColors;
  const intro = escapeMailHtml(options.body.trim()).replace(/\n/g, "<br />");
  const itemsHeading =
    options.language === "nl" ? "In deze release" : "In this release";
  const footerLines = getMailFooterLines(options.language);
  const unsubscribeLines = getMarketingUnsubscribeLines(options.language);
  const unsubscribeHtml = options.includeMarketingFooter
    ? `
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid ${colors.line};color:${colors.muted};">
          <div>${escapeMailHtml(unsubscribeLines[0])}</div>
          <div>${escapeMailHtml(unsubscribeLines[1])}</div>
          <div style="margin-top:6px;"><a href="${resendUnsubscribeUrlPlaceholder}" style="color:${colors.coptic};text-decoration:none;">${resendUnsubscribeUrlPlaceholder}</a></div>
        </div>`
    : "";

  const itemsHtml = options.items
    .map(
      (item) => `
        <li style="margin:0 0 14px;">
          <a href="${escapeMailHtml(item.url_snapshot)}" style="color:#0284c7;text-decoration:none;font-weight:600;">
            ${escapeMailHtml(item.title_snapshot)}
          </a>
          <div style="margin-top:4px;font-size:13px;color:${colors.muted};">${escapeMailHtml(item.url_snapshot)}</div>
        </li>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;background:${colors.elevated};padding:24px 12px;font-family:Aptos,Segoe UI,Helvetica Neue,Arial,sans-serif;color:${colors.ink};">
    <div style="max-width:640px;margin:0 auto;background:${colors.surface};border:1px solid ${colors.line};border-radius:24px;overflow:hidden;box-shadow:0 8px 32px rgba(24,30,27,0.08);">
      <div style="padding:28px 32px;background:linear-gradient(135deg,${colors.copticSoft} 0%,#f0f9ff 100%);border-bottom:1px solid ${colors.line};">
        <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${colors.coptic};font-weight:700;">${options.language === "nl" ? "Nieuwe updates van Coptic Compass" : "New updates from Coptic Compass"}</div>
        <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;color:${colors.ink};">${escapeMailHtml(options.subject)}</h1>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:${colors.ink};">${intro}</p>
        <h2 style="margin:0 0 14px;font-size:18px;line-height:1.4;color:${colors.ink};">${escapeMailHtml(itemsHeading)}</h2>
        <ul style="margin:0;padding-left:20px;">${itemsHtml}</ul>
      </div>
      <div style="padding:24px 32px;border-top:1px solid ${colors.line};background:#fafaf9;font-size:13px;line-height:1.7;color:${colors.muted};">
        <div>${escapeMailHtml(footerLines[0])}</div>
        <div style="font-weight:700;color:${colors.ink};">${escapeMailHtml(footerLines[1])}</div>
        <div>${escapeMailHtml(footerLines[2])}</div>
        <div style="margin-top:8px;"><a href="${mailBrand.liveUrl}" style="color:${colors.coptic};text-decoration:none;">${escapeMailHtml(footerLines[3])}</a></div>
        ${unsubscribeHtml}
      </div>
    </div>
  </body>
</html>`;
}

export function buildContentReleaseNotificationDedupeKey(options: {
  eventType: string;
  recipient: string;
  releaseId: string;
}) {
  return `${options.eventType}:${options.releaseId}:${normalizeEmail(options.recipient)}`;
}

/**
 * Parses the loosely typed delivery summary JSON into a stable structure with
 * zero defaults so workers can safely accumulate counters across batches.
 */
export function getContentReleaseDeliverySummary(
  release: Pick<ContentReleaseRecord, "delivery_summary">,
): ContentReleaseDeliverySummary {
  const summary = asObject(release.delivery_summary);
  const broadcasts = getContentReleaseBroadcastDeliveries(release);

  return {
    ...(broadcasts ? { broadcasts } : {}),
    eligible_recipient_count: readSummaryCount(
      summary,
      "eligible_recipient_count",
    ),
    failed_count: readSummaryCount(summary, "failed_count"),
    item_count: readSummaryCount(summary, "item_count"),
    processed_recipient_count: readSummaryCount(
      summary,
      "processed_recipient_count",
    ),
    remaining_recipient_count: readSummaryCount(
      summary,
      "remaining_recipient_count",
    ),
    sent_count: readSummaryCount(summary, "sent_count"),
    skipped_count: readSummaryCount(summary, "skipped_count"),
  };
}

/**
 * Extracts only valid per-language broadcast records from the stored summary.
 * Invalid or partial entries are ignored so downstream reporting can rely on a
 * consistent "sent broadcast" shape.
 */
function getContentReleaseBroadcastDeliveries(
  release: Pick<ContentReleaseRecord, "delivery_summary">,
) {
  const summary = asObject(release.delivery_summary);
  const broadcasts = asObject(summary?.broadcasts);

  if (!broadcasts) {
    return null;
  }

  const parsedEntries = (["en", "nl"] as const)
    .map((language) => getBroadcastDeliveryEntry(language, broadcasts))
    .filter(
      (entry): entry is readonly [Language, ContentReleaseBroadcastDelivery] =>
        entry !== null,
    );

  if (parsedEntries.length === 0) {
    return null;
  }

  return Object.fromEntries(parsedEntries) as Partial<
    Record<Language, ContentReleaseBroadcastDelivery>
  >;
}

/**
 * Parses one per-language broadcast summary entry and discards incomplete or
 * non-sent records.
 */
function getBroadcastDeliveryEntry(
  language: Language,
  broadcasts: Record<string, unknown>,
) {
  const entry = asObject(broadcasts[language]);
  const id = asOptionalString(entry?.id);
  const segmentId = asOptionalString(entry?.segment_id);
  const subject = asOptionalString(entry?.subject);
  const topicId = asOptionalString(entry?.topic_id);
  const recipientCount = asOptionalNumber(entry?.recipient_count);
  const status = asOptionalString(entry?.status);
  const parsedEntry = {
    id,
    recipientCount,
    segmentId,
    status,
    subject,
    topicId,
  };

  if (!hasCompleteSentBroadcastDelivery(parsedEntry)) {
    return null;
  }

  return [
    language,
    {
      id: parsedEntry.id,
      recipient_count: parsedEntry.recipientCount,
      segment_id: parsedEntry.segmentId,
      status: parsedEntry.status,
      subject: parsedEntry.subject,
      topic_id: parsedEntry.topicId,
    } satisfies ContentReleaseBroadcastDelivery,
  ] as const;
}

function hasCompleteSentBroadcastDelivery(options: {
  id: string | null;
  recipientCount: number | null;
  segmentId: string | null;
  status: string | null;
  subject: string | null;
  topicId: string | null;
}): options is {
  id: string;
  recipientCount: number;
  segmentId: string;
  status: "sent";
  subject: string;
  topicId: string;
} {
  return (
    options.id !== null &&
    options.segmentId !== null &&
    options.subject !== null &&
    options.topicId !== null &&
    options.recipientCount !== null &&
    options.status === "sent"
  );
}

function asOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
