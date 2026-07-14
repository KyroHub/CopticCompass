import fs from "node:fs";
import path from "node:path";

import { describe, expect, expectTypeOf, it } from "vitest";

import type { Database, TablesInsert } from "@/types/supabase";

const MIGRATION_PATH =
  "supabase/migrations/20260622130000_audience_preference_management.sql";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function extractFunction(source: string, name: string) {
  const start = source.indexOf(`create or replace function public.${name}(`);
  const end = source.indexOf("$$;", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end + 3);
}

describe("audience preference schema guardrails", () => {
  it("keeps the preference table and transactional functions in fresh setup", () => {
    const migration = read(MIGRATION_PATH);
    const setup = read("supabase/setup.sql");

    for (const statement of [
      "create table if not exists public.audience_preference_requests",
      "create or replace function public.apply_audience_preferences(",
      "create or replace function public.confirm_audience_opt_in_request(",
      "create or replace function public.apply_audience_preference_request(",
    ]) {
      expect(migration).toContain(statement);
      expect(setup).toContain(statement);
    }
  });

  it("serializes contact changes and appends only changed topic evidence", () => {
    const migration = read(MIGRATION_PATH);
    const command = extractFunction(migration, "apply_audience_preferences");

    expect(command).toContain("pg_advisory_xact_lock");
    expect(command).toContain("for update");
    expect(command).toContain("audience_consent_events");
    expect(command).toContain(
      "where change.previous_value is distinct from change.next_value",
    );
    expect(command).toContain("Only an explicit user command may opt into");
    expect(command).toContain("set search_path = ''");
  });

  it("locks and consumes both token types inside their mutation transaction", () => {
    const migration = read(MIGRATION_PATH);

    for (const name of [
      "confirm_audience_opt_in_request",
      "apply_audience_preference_request",
    ]) {
      const command = extractFunction(migration, name);
      expect(command).toContain("for update");
      expect(command).toContain("public.apply_audience_preferences(");
      expect(command).toContain("set search_path = ''");
    }

    expect(migration).toContain("from public, anon, authenticated;");
    expect(migration).toContain("to service_role;");
  });

  it("keeps token GET pages read-only, dynamic, and noindex", () => {
    const confirmationPage = read(
      "src/app/(site)/[locale]/communications/confirm/page.tsx",
    );
    const preferencePage = read(
      "src/app/(site)/[locale]/communications/preferences/page.tsx",
    );

    expect(confirmationPage).toContain("getAudienceOptInRequestPreview");
    expect(confirmationPage).not.toContain("confirmAudienceOptInRequest");
    expect(confirmationPage).toContain("action={confirmAudienceOptIn}");

    for (const page of [confirmationPage, preferencePage]) {
      expect(page).toContain('dynamic = "force-dynamic"');
      expect(page).toContain('fetchCache = "force-no-store"');
      expect(page).toContain("createNoIndexMetadata");
    }
  });

  it("exposes typed token and RPC contracts", () => {
    expectTypeOf<TablesInsert<"audience_preference_requests">>().toMatchTypeOf<{
      audience_contact_id: string;
      expires_at: string;
      token_hash: string;
    }>();

    type ApplyArgs =
      Database["public"]["Functions"]["apply_audience_preferences"]["Args"];
    expectTypeOf<ApplyArgs>().toMatchTypeOf<{
      p_actor: string;
      p_email: string;
      p_policy_version: string;
      p_source: string;
    }>();
  });
});
