import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("profile signup alert worker guardrails", () => {
  it("uses a dedicated webhook token instead of service-role bearer equality", () => {
    const worker = readProjectFile(
      "supabase/functions/profile-signup-alert/index.ts",
    );

    expect(worker).toContain("SIGNUP_ALERT_WEBHOOK_TOKEN");
    expect(worker).toContain("x-signup-alert-webhook-token");
    expect(worker).toContain("hasExpectedHeaderValue(");
    expect(worker).not.toContain(
      "hasExpectedBearerToken(request, env.supabaseServiceRoleKey)",
    );
  });
});
