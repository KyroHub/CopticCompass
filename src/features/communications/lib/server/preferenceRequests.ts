import "server-only";
import { createHash, randomBytes } from "node:crypto";

import { isLanguage, type Language } from "@/lib/i18n";
import { getCommunicationPreferencesPath } from "@/lib/locale";
import { assertServerOnly } from "@/lib/server/assertServerOnly";
import { getSiteUrl, siteConfig } from "@/lib/site";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { normalizeWhitespace } from "@/lib/validation";
import type { TablesInsert } from "@/types/supabase";

import {
  COMMUNICATIONS_POLICY_VERSION,
  syncAudienceContactByIdToProvider,
} from "./audience";

const PREFERENCE_TOKEN_TTL_MS = 1000 * 60 * 30;

function normalizeAudienceEmail(email: string) {
  return normalizeWhitespace(email).toLowerCase();
}

function createPreferenceToken() {
  return randomBytes(24).toString("base64url");
}

function hashPreferenceToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeAudienceLocale(locale?: Language | null) {
  return locale && isLanguage(locale) ? locale : "en";
}

export function buildAudiencePreferenceUrl(locale: Language, token: string) {
  assertServerOnly("buildAudiencePreferenceUrl");

  const siteUrl = getSiteUrl() ?? new URL(siteConfig.liveUrl);
  const url = new URL(getCommunicationPreferencesPath(locale), siteUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

/**
 * Creates a single-use preference link only when the normalized email belongs
 * to an audience contact. Callers must keep the not-found result indistinguishable.
 */
export async function createAudiencePreferenceRequest(
  email: string,
  locale?: Language | null,
) {
  assertServerOnly("createAudiencePreferenceRequest");

  const supabase = createServiceRoleClient();
  const normalizedEmail = normalizeAudienceEmail(email);
  const normalizedLocale = normalizeAudienceLocale(locale);
  const { data: contact, error: contactError } = await supabase
    .from("audience_contacts")
    .select("*")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (contactError) {
    throw new Error(contactError.message);
  }

  if (!contact) {
    return null;
  }

  const token = createPreferenceToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PREFERENCE_TOKEN_TTL_MS);

  const { error: revokeError } = await supabase
    .from("audience_preference_requests")
    .update({ used_at: now.toISOString() })
    .eq("audience_contact_id", contact.id)
    .is("used_at", null);

  if (revokeError) {
    throw new Error(revokeError.message);
  }

  const { data: request, error: requestError } = await supabase
    .from("audience_preference_requests")
    .insert({
      audience_contact_id: contact.id,
      expires_at: expiresAt.toISOString(),
      locale: normalizedLocale,
      token_hash: hashPreferenceToken(token),
    } satisfies TablesInsert<"audience_preference_requests">)
    .select("*")
    .single();

  if (requestError) {
    throw new Error(requestError.message);
  }

  return { contact, request, token };
}

export async function getAudiencePreferenceRequestPreview(token: string) {
  assertServerOnly("getAudiencePreferenceRequestPreview");

  const normalizedToken = normalizeWhitespace(token);
  if (!normalizedToken) {
    return { contact: null, request: null, status: "invalid" as const };
  }

  const supabase = createServiceRoleClient();
  const { data: request, error: requestError } = await supabase
    .from("audience_preference_requests")
    .select("*")
    .eq("token_hash", hashPreferenceToken(normalizedToken))
    .maybeSingle();

  if (requestError) {
    throw new Error(requestError.message);
  }

  if (!request) {
    return { contact: null, request: null, status: "invalid" as const };
  }

  const { data: contact, error: contactError } = await supabase
    .from("audience_contacts")
    .select("*")
    .eq("id", request.audience_contact_id)
    .maybeSingle();

  if (contactError) {
    throw new Error(contactError.message);
  }

  if (!contact) {
    return { contact: null, request, status: "invalid" as const };
  }

  if (request.used_at) {
    return { contact, request, status: "already_used" as const };
  }

  if (new Date(request.expires_at).getTime() <= Date.now()) {
    return { contact, request, status: "expired" as const };
  }

  return { contact, request, status: "valid" as const };
}

/** Applies topic changes and consumes the magic link in one transaction. */
export async function applyAudiencePreferenceRequest(options: {
  booksOptIn: boolean;
  generalUpdatesOptIn: boolean;
  lessonsOptIn: boolean;
  token: string;
}) {
  assertServerOnly("applyAudiencePreferenceRequest");

  const normalizedToken = normalizeWhitespace(options.token);
  if (!normalizedToken) {
    return { status: "invalid" as const };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc(
    "apply_audience_preference_request",
    {
      p_books_opt_in: options.booksOptIn,
      p_general_updates_opt_in: options.generalUpdatesOptIn,
      p_lessons_opt_in: options.lessonsOptIn,
      p_occurred_at: new Date().toISOString(),
      p_policy_version: COMMUNICATIONS_POLICY_VERSION,
      p_token_hash: hashPreferenceToken(normalizedToken),
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  const result = data?.[0];
  if (!result) {
    return { status: "invalid" as const };
  }

  if (result.status === "updated" && result.audience_contact_id) {
    await syncAudienceContactByIdToProvider(result.audience_contact_id);
    return { status: "updated" as const };
  }

  if (result.status === "already_used" || result.status === "expired") {
    return { status: result.status };
  }

  return { status: "invalid" as const };
}
