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
    const sharedRelease = readProjectFile(
      "supabase/functions/_shared/contentReleaseDelivery.ts",
    );
    const broadcastWorker = readProjectFile(
      "supabase/functions/process-content-release/broadcasts.ts",
    );

    expect(sharedRelease).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(broadcastWorker).toContain("topic_id: options.topicId");
    expect(broadcastWorker).toContain("includeMarketingFooter: true");
    expect(broadcastWorker).toContain(
      "Resend Broadcasts require a Segment ID and Topic ID",
    );
  });

  it("keeps direct marketing Email API sends unreachable from the release worker", () => {
    const releaseWorker = readProjectFile(
      "supabase/functions/process-content-release/index.ts",
    );

    expect(releaseWorker).not.toContain("https://api.resend.com/emails");
    expect(releaseWorker).not.toContain("sendResendEmail");
    expect(releaseWorker).not.toContain("loadAudienceContacts");
    expect(releaseWorker).not.toContain("processReleaseContacts");
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
});
