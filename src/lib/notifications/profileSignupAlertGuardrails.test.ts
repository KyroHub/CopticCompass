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

  it("keeps the database trigger credentials in Vault", () => {
    const migration = readProjectFile(
      "supabase/migrations/20260715090000_profile_signup_alert_vault_trigger.sql",
    );

    expect(migration).toContain("create extension if not exists pg_net");
    expect(migration).toContain("public.invoke_profile_signup_alert()");
    expect(migration).toContain("from vault.decrypted_secrets");
    expect(migration).toContain("profile_signup_alert_project_url");
    expect(migration).toContain("profile_signup_alert_service_role_key");
    expect(migration).toContain("profile_signup_alert_webhook_token");
    expect(migration).toContain(
      'drop trigger if exists "profile-signup-alert"',
    );
    expect(migration).toContain('create trigger "profile-signup-alert"');
    expect(migration).toContain(
      "v_project_url || '/functions/v1/profile-signup-alert'",
    );
    expect(migration).not.toContain("supabase_functions.http_request");
    expect(migration).not.toContain("SIGNUP_ALERT_WEBHOOK_TOKEN");
    expect(migration).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
