import fs from "node:fs";
import path from "node:path";

import { describe, expect, expectTypeOf, it } from "vitest";

import type {
  Database,
  Json,
  TablesInsert,
  TablesUpdate,
} from "@/types/supabase";

const MIGRATION_PATH =
  "supabase/migrations/20260622120000_mailing_system_foundations.sql";
const DURABLE_QUEUE_MIGRATION_PATH =
  "supabase/migrations/20260626213000_durable_notification_queue.sql";
const CONTENT_RELEASE_TARGETS_MIGRATION_PATH =
  "supabase/migrations/20260628213000_content_release_targets.sql";
const CONTENT_RELEASE_TARGETS_LINT_FIX_MIGRATION_PATH =
  "supabase/migrations/20260714134000_fix_content_release_target_conflict_lint.sql";
const DELIVERY_FEEDBACK_MIGRATION_PATH =
  "supabase/migrations/20260709120000_delivery_feedback_operational_state.sql";

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function extractClaimFunction(source: string) {
  const start = source.indexOf(
    "create or replace function public.claim_notification_email_jobs(",
  );
  const end = source.indexOf("$$;", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end + 3);
}

function extractFunction(source: string, functionName: string) {
  const start = source.indexOf(
    `create or replace function public.${functionName}(`,
  );
  const end = source.indexOf("$$;", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end + 3);
}

function extractPolicy(source: string, policyName: string) {
  const start = source.indexOf(`create policy "${policyName}"`);
  const end = source.indexOf(";", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end + 1);
}

describe("mailing system schema guardrails", () => {
  it("keeps the migration and fresh setup schema in parity", () => {
    const migration = readProjectFile(MIGRATION_PATH);
    const setup = readProjectFile("supabase/setup.sql");

    for (const table of [
      "audience_consent_events",
      "audience_suppressions",
      "provider_webhook_events",
    ]) {
      const createStatement = `create table if not exists public.${table}`;
      const rlsStatement = `alter table public.${table} enable row level security;`;

      expect(migration, table).toContain(createStatement);
      expect(migration, table).toContain(rlsStatement);
      expect(setup, table).toContain(createStatement);
      expect(setup, table).toContain(rlsStatement);
    }

    for (const policy of [
      "Admins can read all audience consent events",
      "Admins can read all audience suppressions",
      "Admins can read all provider webhook events",
    ]) {
      expect(extractPolicy(migration, policy), policy).toContain("for select");
      expect(extractPolicy(setup, policy), policy).toContain("for select");
    }

    for (const column of [
      "attempt_count",
      "max_attempts",
      "next_attempt_at",
      "last_attempt_at",
      "locked_at",
      "lock_expires_at",
      "provider_message_id",
    ]) {
      expect(migration, column).toContain(column);
      expect(setup, column).toContain(column);
    }
  });

  it("keeps consent migration evidence append-only and idempotent", () => {
    const migration = readProjectFile(MIGRATION_PATH);

    expect(migration).toContain("'admin_migration'");
    expect(migration).toContain("'legacy-2026-06-22'");
    expect(migration).toContain("on conflict (dedupe_key) do nothing");
    expect(migration).toContain("pg_column_size(metadata) <= 65536");
    expect(migration).toContain("pg_column_size(payload) <= 1048576");
    expect(migration).toContain(
      "audience_contact_id uuid not null references public.audience_contacts (id) on delete cascade",
    );
    const consentReadPolicy = extractPolicy(
      migration,
      "Admins can read all audience consent events",
    );
    expect(consentReadPolicy).toContain("for select");
    expect(consentReadPolicy).not.toMatch(/for (insert|update|delete)/i);
  });

  it("restricts atomic job claiming to bounded service-role calls", () => {
    for (const relativePath of [MIGRATION_PATH, "supabase/setup.sql"]) {
      const source = readProjectFile(relativePath);
      const claimFunction = extractClaimFunction(source);

      expect(claimFunction, relativePath).toContain("security invoker");
      expect(claimFunction, relativePath).toContain("set search_path = ''");
      expect(claimFunction, relativePath).toContain(
        "for update of job skip locked",
      );
      expect(claimFunction, relativePath).toContain(
        "coalesce(\n            job.lock_expires_at",
      );
      expect(claimFunction, relativePath).toContain(
        "p_limit < 1 or p_limit > 100",
      );
      expect(claimFunction, relativePath).toContain(
        "p_lease_seconds < 30 or p_lease_seconds > 3600",
      );
      expect(claimFunction, relativePath).not.toContain("security definer");
      expect(source, relativePath).toContain(
        "from public, anon, authenticated;",
      );
      expect(source, relativePath).toContain("to service_role;");
    }
  });

  it("keeps durable enqueue and manual retry setup in parity", () => {
    const migration = readProjectFile(DURABLE_QUEUE_MIGRATION_PATH);
    const setup = readProjectFile("supabase/setup.sql");

    for (const source of [migration, setup]) {
      expect(source).toContain(
        "create table if not exists public.notification_email_job_audit_events",
      );
      expect(source).toContain(
        'create policy "Admins can read all notification email jobs"',
      );
      expect(source).toContain(
        'create policy "Admins can read all notification email job audit events"',
      );

      const enqueueFunction = extractFunction(
        source,
        "enqueue_notification_email_job",
      );
      expect(enqueueFunction).toContain("security invoker");
      expect(enqueueFunction).toContain(
        "on conflict (notification_event_id) do nothing",
      );
      expect(enqueueFunction).toContain("return query");

      const retryFunction = extractFunction(
        source,
        "retry_notification_email_job",
      );
      expect(retryFunction).toContain("security definer");
      expect(retryFunction).toContain("if not public.is_admin()");
      expect(retryFunction).toContain("v_event.payload @>");
      expect(retryFunction).toContain(
        "Recipient is actively suppressed and this notification is not classified as required transactional mail",
      );
      expect(retryFunction).toContain(
        "insert into public.notification_email_job_audit_events",
      );
    }
  });

  it("keeps resumable content release target setup in parity", () => {
    const migration = readProjectFile(CONTENT_RELEASE_TARGETS_MIGRATION_PATH);
    const setup = readProjectFile("supabase/setup.sql");

    for (const source of [migration, setup]) {
      expect(source).toContain(
        "create table if not exists public.content_release_targets",
      );
      expect(source).toContain("'partially_failed'");
      expect(source).toContain("provider_broadcast_id text");
      expect(source).toContain(
        "unique (release_id, language, segment_id, topic_id)",
      );
      expect(source).toContain("unique (provider_broadcast_id)");
      expect(source).toContain(
        'create policy "Admins can read all content release targets"',
      );
      expect(source).toContain(
        "comment on table public.content_release_targets",
      );

      const queueFunction = extractFunction(
        source,
        "queue_content_release_delivery_with_targets",
      );
      expect(queueFunction).toContain("security definer");
      expect(queueFunction).toContain("if not public.is_admin()");
      expect(queueFunction).toContain("for update");
      expect(queueFunction).toContain(
        "v_release.status not in ('approved', 'partially_failed')",
      );
      expect(queueFunction).toContain(
        "on conflict (release_id, language, segment_id, topic_id) do update",
      );
      expect(queueFunction).toContain(
        "when public.content_release_targets.status = 'accepted'",
      );
      expect(queueFunction).toContain("status = 'queued'");
      expect(queueFunction).toContain("jsonb_build_object");

      const lintFixSource = readProjectFile(
        CONTENT_RELEASE_TARGETS_LINT_FIX_MIGRATION_PATH,
      );
      const lintFixQueueFunction = extractFunction(
        lintFixSource,
        "queue_content_release_delivery_with_targets",
      );
      expect(lintFixQueueFunction).toContain(
        "on conflict on constraint content_release_targets_release_id_language_segment_id_topi_key do update",
      );
    }
  });

  it("keeps content release delivery feedback setup in parity", () => {
    const migration = readProjectFile(DELIVERY_FEEDBACK_MIGRATION_PATH);
    const setup = readProjectFile("supabase/setup.sql");

    for (const source of [migration, setup]) {
      for (const column of [
        "last_provider_status",
        "provider_status_updated_at",
        "last_provider_event_id",
        "last_provider_error",
        "delivered_at",
        "delayed_at",
        "bounced_at",
        "complained_at",
        "suppressed_at",
      ]) {
        expect(source, column).toContain(column);
      }

      expect(source).toContain("content_release_targets_provider_status_idx");
      expect(source).toContain(
        "comment on column public.content_release_targets.last_provider_status",
      );
      expect(source).toContain(
        "comment on column public.content_release_targets.last_provider_error",
      );
    }

    expect(migration).toContain(
      "content_release_targets_last_provider_status_check",
    );
    expect(migration).toContain(
      "content_release_targets_last_provider_event_id_check",
    );
    expect(migration).toContain(
      "content_release_targets_last_provider_error_check",
    );
    expect(setup).toContain("last_provider_status text check");
    expect(setup).toContain("last_provider_event_id text check");
    expect(setup).toContain("last_provider_error text check");
  });

  it("retains legacy sent states during the additive rollout", () => {
    const migration = readProjectFile(MIGRATION_PATH);

    expect(migration).toMatch(
      /notification_events_status_check[\s\S]*'accepted'[\s\S]*'sent'/,
    );
    expect(migration).toMatch(
      /notification_deliveries_status_check[\s\S]*'delivered'[\s\S]*'sent'/,
    );
    expect(migration).toMatch(
      /notification_email_jobs_status_check[\s\S]*'retry_scheduled'[\s\S]*'sent'/,
    );
  });

  it("exposes typed contracts for future consent and retry workers", () => {
    type ClaimArgs =
      Database["public"]["Functions"]["claim_notification_email_jobs"]["Args"];
    type EnqueueArgs =
      Database["public"]["Functions"]["enqueue_notification_email_job"]["Args"];
    type RetryArgs =
      Database["public"]["Functions"]["retry_notification_email_job"]["Args"];

    expectTypeOf<ClaimArgs>().toMatchTypeOf<{
      p_job_id?: string;
      p_lease_seconds?: number;
      p_limit?: number;
    }>();
    expectTypeOf<EnqueueArgs>().toMatchTypeOf<{
      p_event_type: string;
      p_text_body: string;
      p_to_recipients: string[];
    }>();
    expectTypeOf<RetryArgs>().toEqualTypeOf<{
      p_job_id: string;
      p_reason: string;
    }>();

    expectTypeOf<TablesInsert<"audience_consent_events">>().toMatchTypeOf<{
      action: "opted_in" | "opted_out" | "suppressed" | "suppression_lifted";
      audience_contact_id: string;
      policy_version: string;
      source:
        | "admin_migration"
        | "contact_form"
        | "dashboard"
        | "public_preferences"
        | "resend_webhook"
        | "signup"
        | "system";
      topic: "all" | "books" | "general_updates" | "lessons";
    }>();

    expectTypeOf<TablesInsert<"audience_suppressions">>().toMatchTypeOf<{
      audience_contact_id: string;
      reason:
        | "hard_bounce"
        | "invalid_address"
        | "manual"
        | "provider_unsubscribe"
        | "spam_complaint";
    }>();

    expectTypeOf<TablesInsert<"provider_webhook_events">>().toMatchTypeOf<{
      event_type: string;
      provider: "resend";
      provider_event_id: string;
    }>();

    expectTypeOf<
      TablesUpdate<"notification_email_jobs">["status"]
    >().toEqualTypeOf<
      | "accepted"
      | "dead_letter"
      | "failed"
      | "processing"
      | "queued"
      | "retry_scheduled"
      | "sent"
      | undefined
    >();

    expectTypeOf<
      TablesInsert<"notification_email_job_audit_events">
    >().toMatchTypeOf<{
      action: "manual_retry";
      notification_email_job_id: string;
      reason: string;
    }>();
  });

  it("exposes typed contracts for resumable content release delivery", () => {
    type QueueReleaseArgs =
      Database["public"]["Functions"]["queue_content_release_delivery_with_targets"]["Args"];
    type QueueReleaseResult =
      Database["public"]["Functions"]["queue_content_release_delivery_with_targets"]["Returns"][number];

    expectTypeOf<QueueReleaseArgs>().toEqualTypeOf<{
      p_item_count: number;
      p_release_id: string;
      p_targets: Json;
    }>();
    expectTypeOf<QueueReleaseResult>().toMatchTypeOf<{
      release_id: string;
      target_count: number;
      total_recipient_count: number;
    }>();
    expectTypeOf<QueueReleaseResult["release_status"]>().toEqualTypeOf<
      | "approved"
      | "cancelled"
      | "draft"
      | "partially_failed"
      | "queued"
      | "sending"
      | "sent"
    >();

    expectTypeOf<TablesInsert<"content_release_targets">>().toMatchTypeOf<{
      language: "en" | "nl";
      recipient_count_snapshot: number;
      release_id: string;
      segment_id: string;
      subject_snapshot: string;
      topic_id: string;
    }>();
    expectTypeOf<
      TablesUpdate<"content_release_targets">["status"]
    >().toEqualTypeOf<
      | "accepted"
      | "cancelled"
      | "created"
      | "creating"
      | "failed"
      | "pending"
      | "sending"
      | undefined
    >();
    expectTypeOf<
      TablesUpdate<"content_release_targets">["last_provider_status"]
    >().toEqualTypeOf<
      | "accepted"
      | "bounced"
      | "complained"
      | "delayed"
      | "delivered"
      | "failed"
      | "suppressed"
      | null
      | undefined
    >();
    expectTypeOf<TablesUpdate<"content_releases">["status"]>().toEqualTypeOf<
      | "approved"
      | "cancelled"
      | "draft"
      | "partially_failed"
      | "queued"
      | "sending"
      | "sent"
      | undefined
    >();
  });
});
