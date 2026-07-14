import "server-only";

import { isLanguage, type Language } from "@/lib/i18n";
import { redactEmailAddress } from "@/lib/privacy";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { normalizeWhitespace } from "@/lib/validation";
import type { Tables, TablesInsert } from "@/types/supabase";

import { syncStoredAudienceContactToResend } from "./resend";

export const COMMUNICATIONS_POLICY_VERSION = "privacy-2026-06-22";

type AudienceContactRow = Tables<"audience_contacts">;
type AudienceContactSource = TablesInsert<"audience_contacts">["source"];

type AudiencePreferenceActor =
  | "authenticated_user"
  | "provider"
  | "system"
  | "visitor";

interface ApplyAudiencePreferencesInput {
  actor: AudiencePreferenceActor;
  booksOptIn: boolean;
  dedupePrefix?: string | null;
  email: string;
  fullName?: string | null;
  generalUpdatesOptIn: boolean;
  lessonsOptIn: boolean;
  locale?: Language | null;
  occurredAt?: string;
  optInRequestId?: string | null;
  policyVersion: string;
  profileId?: string | null;
  source: AudienceContactSource;
}

function normalizeAudienceEmail(email: string) {
  return normalizeWhitespace(email).toLowerCase();
}

function normalizeAudienceFullName(value?: string | null) {
  const normalized = normalizeWhitespace(value ?? "");
  return normalized.length > 0 ? normalized : null;
}

function normalizeAudienceLocale(locale?: Language | null) {
  return locale && isLanguage(locale) ? locale : "en";
}

/**
 * Synchronizes the committed preference state to Resend without turning a
 * provider outage into a failed consent command.
 */
async function syncAudienceContactToProvider(
  contact: AudienceContactRow,
  supabase = createServiceRoleClient(),
) {
  try {
    const result = await syncStoredAudienceContactToResend(contact, supabase);
    if (!result.success) {
      console.error("Failed to sync audience contact to Resend", {
        audienceContactId: contact.id,
        email: redactEmailAddress(contact.email),
        error: result.error,
      });
    }

    return result.contact;
  } catch (error) {
    console.error("Unexpected audience contact sync failure", {
      audienceContactId: contact.id,
      email: redactEmailAddress(contact.email),
      error,
    });
    return contact;
  }
}

/**
 * Applies one explicit preference command transactionally, including its
 * append-only topic consent events, then mirrors the committed state to Resend.
 */
export async function applyAudiencePreferences({
  actor,
  booksOptIn,
  dedupePrefix = null,
  email,
  fullName,
  generalUpdatesOptIn,
  lessonsOptIn,
  locale,
  occurredAt = new Date().toISOString(),
  optInRequestId = null,
  policyVersion,
  profileId = null,
  source,
}: ApplyAudiencePreferencesInput) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("apply_audience_preferences", {
    p_actor: actor,
    p_books_opt_in: booksOptIn,
    p_dedupe_prefix: dedupePrefix,
    p_email: normalizeAudienceEmail(email),
    p_full_name: normalizeAudienceFullName(fullName),
    p_general_updates_opt_in: generalUpdatesOptIn,
    p_lessons_opt_in: lessonsOptIn,
    p_locale: normalizeAudienceLocale(locale),
    p_occurred_at: occurredAt,
    p_opt_in_request_id: optInRequestId,
    p_policy_version: policyVersion,
    p_profile_id: profileId,
    p_source: source,
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Audience preference update failed.");
  }

  return syncAudienceContactToProvider(data, supabase);
}

/**
 * Loads a committed contact after a token RPC and mirrors it to the provider.
 */
export async function syncAudienceContactByIdToProvider(
  audienceContactId: string,
) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("audience_contacts")
    .select("*")
    .eq("id", audienceContactId)
    .single();

  if (error) {
    console.error("Failed to reload audience contact for provider sync", {
      audienceContactId,
      error: error.message,
    });
    return null;
  }

  return syncAudienceContactToProvider(data, supabase);
}
