import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("notification email worker guardrails", () => {
  it("claims leased jobs and sends with stable Resend idempotency", () => {
    const worker = readProjectFile(
      "supabase/functions/process-notification-email/index.ts",
    );
    const resendEmailAdapter = readProjectFile(
      "supabase/functions/_shared/resendEmail.ts",
    );

    expect(worker).toContain("rpc/claim_notification_email_jobs");
    expect(worker).toContain("NOTIFICATION_JOB_LEASE_SECONDS = 300");
    expect(resendEmailAdapter).toContain("Idempotency-Key");
    expect(worker).toContain("buildNotificationEmailIdempotencyKey");
    expect(worker).toContain("retry_scheduled");
    expect(worker).toContain("dead_letter");
    expect(worker).toContain("NOTIFICATION_WORKER_BEARER_TOKEN");
    expect(worker).toContain(
      "hasExpectedBearerToken(request, env.workerBearerToken)",
    );
    expect(worker).not.toContain("status=eq.queued");
    expect(worker).not.toContain(
      "hasExpectedBearerToken(request, env.serviceRoleKey)",
    );
  });
});
