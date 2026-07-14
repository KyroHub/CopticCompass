import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Resend provider integration guardrails", () => {
  it("keeps audience sync explicit about managed Resend Topics", () => {
    const resendSync = readProjectFile(
      "src/features/communications/lib/server/resend.ts",
    );

    for (const envKey of [
      "RESEND_LESSONS_TOPIC_ID",
      "RESEND_BOOKS_TOPIC_ID",
      "RESEND_GENERAL_TOPIC_ID",
    ]) {
      expect(resendSync).toContain(envKey);
    }

    expect(resendSync).toContain("contacts.topics.update");
    expect(resendSync).toContain('"opt_in"');
    expect(resendSync).toContain('"opt_out"');
  });

  it("requires Broadcast Topics and provider unsubscribe links for releases", () => {
    const sharedMailRendering = readProjectFile(
      "supabase/functions/_shared/mailRendering.ts",
    );
    const sharedRelease = readProjectFile(
      "supabase/functions/_shared/contentReleaseDelivery.ts",
    );
    const broadcastWorker = readProjectFile(
      "supabase/functions/process-content-release/broadcasts.ts",
    );
    const supabaseRestWorker = readProjectFile(
      "supabase/functions/process-content-release/supabaseRest.ts",
    );

    expect(sharedMailRendering).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(sharedRelease).toContain("./mailRendering.ts");
    expect(sharedRelease).toContain("getMarketingUnsubscribeLines");
    expect(sharedRelease).toContain("resendUnsubscribeUrlPlaceholder");
    expect(sharedRelease).not.toContain("const MAIL_BRAND");
    expect(broadcastWorker).toContain("segment_id: options.segmentId");
    expect(broadcastWorker).toContain("topic_id: options.topicId");
    expect(broadcastWorker).toContain("send: false");
    expect(broadcastWorker).toContain("/broadcasts/${encodeURIComponent");
    expect(broadcastWorker).toContain("getResendBroadcastStatus");
    expect(broadcastWorker).toContain('providerBroadcast.status === "sent"');
    expect(broadcastWorker).toContain("includeMarketingFooter: true");
    expect(broadcastWorker).toContain("provider_broadcast_id");
    expect(supabaseRestWorker).toContain("content_release_targets");
  });

  it("keeps direct marketing Email API sends unreachable from the release worker", () => {
    const releaseWorker = readProjectFile(
      "supabase/functions/process-content-release/index.ts",
    );
    const broadcastWorker = readProjectFile(
      "supabase/functions/process-content-release/broadcasts.ts",
    );

    expect(releaseWorker).not.toContain("https://api.resend.com/emails");
    expect(releaseWorker).not.toContain("sendResendEmail");
    expect(releaseWorker).not.toContain("loadAudienceContacts");
    expect(releaseWorker).not.toContain("processReleaseContacts");
    expect(broadcastWorker).not.toContain("https://api.resend.com/emails");
  });

  it("keeps direct Resend Email API calls behind the shared Edge adapter", () => {
    const resendEmailAdapter = readProjectFile(
      "supabase/functions/_shared/resendEmail.ts",
    );
    const notificationWorker = readProjectFile(
      "supabase/functions/process-notification-email/index.ts",
    );
    const signupAlertWorker = readProjectFile(
      "supabase/functions/profile-signup-alert/index.ts",
    );

    expect(resendEmailAdapter).toContain("https://api.resend.com/emails");
    expect(resendEmailAdapter).toContain('"Idempotency-Key"');
    expect(resendEmailAdapter).toContain("reply_to");
    expect(resendEmailAdapter).toContain("tags");
    expect(notificationWorker).toContain("../_shared/resendEmail.ts");
    expect(signupAlertWorker).toContain("../_shared/resendEmail.ts");
    expect(notificationWorker).not.toContain("https://api.resend.com/emails");
    expect(signupAlertWorker).not.toContain("https://api.resend.com/emails");
  });

  it("keeps signed webhook capture idempotent and capture-only by default", () => {
    const webhookHandler = readProjectFile(
      "src/features/communications/lib/server/resendWebhooks.ts",
    );
    const route = readProjectFile("src/app/api/resend/webhook/route.ts");

    expect(route).toContain("handleResendWebhookRequest");
    expect(webhookHandler).toContain("webhooks.verify");
    expect(webhookHandler).toContain("provider_webhook_events");
    expect(webhookHandler).toContain("RESEND_WEBHOOK_PROCESSING_ENABLED");
    expect(webhookHandler).toContain("duplicate: true");
    expect(webhookHandler).toContain("apply_audience_preferences");
    expect(webhookHandler).toContain("audience_suppressions");
  });

  it("keeps mailing retention dry-run first and away from consent evidence", () => {
    const retentionMigration = readProjectFile(
      "supabase/migrations/20260714120000_mailing_retention_jobs.sql",
    );

    expect(retentionMigration).toContain("p_dry_run boolean default true");
    expect(retentionMigration).toContain(
      "revoke all on function public.run_mailing_retention",
    );
    expect(retentionMigration).toContain("from public, anon, authenticated");
    expect(retentionMigration).toContain("to service_role");
    expect(retentionMigration).toContain("confirmed_at is null");
    expect(retentionMigration).toContain("redact_raw_payload");
    expect(retentionMigration).toContain("redact_successful_bodies");
    expect(retentionMigration).not.toMatch(
      /delete\s+from\s+public\.audience_consent_events/i,
    );
    expect(retentionMigration).not.toMatch(
      /delete\s+from\s+public\.audience_suppressions/i,
    );
    expect(retentionMigration).not.toMatch(
      /update\s+public\.audience_consent_events/i,
    );
    expect(retentionMigration).not.toMatch(
      /update\s+public\.audience_suppressions/i,
    );
  });
});
