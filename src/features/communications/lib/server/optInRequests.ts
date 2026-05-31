import { createHash, randomBytes } from "node:crypto";

import { isLanguage, type Language } from "@/lib/i18n";
import { getLocalizedPath } from "@/lib/locale";
import { assertServerOnly } from "@/lib/server/assertServerOnly";
import { getSiteUrl, siteConfig } from "@/lib/site";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { normalizeWhitespace } from "@/lib/validation";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

import { syncAudienceContact } from "./audience";

type AudienceOptInRequestRow = Tables<"audience_opt_in_requests">;
type AudienceOptInRequestSource = AudienceOptInRequestRow["source"];

const AUDIENCE_OPT_IN_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

type CreateAudienceOptInRequestInput = {
  booksRequested: boolean;
  email: string;
  fullName?: string | null;
  generalUpdatesRequested: boolean;
  lessonsRequested: boolean;
  locale?: Language | null;
  source: AudienceOptInRequestSource;
};

type CreateAudienceOptInRequestResult = {
  request: AudienceOptInRequestRow;
  token: string;
};

type ConfirmAudienceOptInRequestResult =
  | {
      request: AudienceOptInRequestRow | null;
      status: "confirmed" | "already_confirmed";
      success: true;
    }
  | {
      request: AudienceOptInRequestRow | null;
      status: "expired" | "invalid";
      success: false;
    };

/**
 * Normalizes an audience email address before it is stored or used for
 * lookups.
 */
function normalizeAudienceEmail(email: string) {
  return normalizeWhitespace(email).toLowerCase();
}

/**
 * Normalizes an optional audience full name and collapses blank input to
 * `null`.
 */
function normalizeAudienceFullName(value?: string | null) {
  const normalized = normalizeWhitespace(value ?? "");
  return normalized.length > 0 ? normalized : null;
}

/**
 * Resolves an optional locale value to a supported audience locale.
 */
function normalizeAudienceLocale(locale?: Language | null) {
  return locale && isLanguage(locale) ? locale : "en";
}

/**
 * Generates the raw confirmation token that will be sent to the subscriber.
 */
function createOptInToken() {
  return randomBytes(24).toString("base64url");
}

/**
 * Hashes a confirmation token before it is persisted so the raw token only
 * travels in the email link.
 */
function hashOptInToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Returns the ISO timestamp when a newly issued opt-in token should expire.
 */
function getAudienceOptInExpiry() {
  return new Date(Date.now() + AUDIENCE_OPT_IN_TOKEN_TTL_MS).toISOString();
}

/**
 * Builds the absolute confirmation URL for an audience double-opt-in token.
 */
export function buildAudienceOptInConfirmationUrl(
  locale: Language,
  token: string,
) {
  assertServerOnly("buildAudienceOptInConfirmationUrl");

  const siteUrl = getSiteUrl() ?? new URL(siteConfig.liveUrl);
  const url = new URL(
    getLocalizedPath(locale, "/communications/confirm"),
    siteUrl,
  );
  url.searchParams.set("token", token);
  return url.toString();
}

/**
 * Creates or refreshes an audience opt-in request and returns the stored row
 * together with the unhashed confirmation token for email delivery.
 */
export async function createAudienceOptInRequest({
  booksRequested,
  email,
  fullName,
  generalUpdatesRequested,
  lessonsRequested,
  locale,
  source,
}: CreateAudienceOptInRequestInput): Promise<CreateAudienceOptInRequestResult> {
  assertServerOnly("createAudienceOptInRequest");

  const supabase = createServiceRoleClient();
  const normalizedEmail = normalizeAudienceEmail(email);
  const normalizedFullName = normalizeAudienceFullName(fullName);
  const normalizedLocale = normalizeAudienceLocale(locale);
  const token = createOptInToken();
  const now = new Date().toISOString();
  const payload = {
    books_requested: booksRequested,
    confirmed_at: null,
    email: normalizedEmail,
    expires_at: getAudienceOptInExpiry(),
    full_name: normalizedFullName,
    general_updates_requested: generalUpdatesRequested,
    lessons_requested: lessonsRequested,
    locale: normalizedLocale,
    source,
    token_hash: hashOptInToken(token),
    updated_at: now,
  } satisfies TablesUpdate<"audience_opt_in_requests">;

  const { data: existingRequest, error: existingRequestError } = await supabase
    .from("audience_opt_in_requests")
    .select("*")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingRequestError) {
    throw new Error(existingRequestError.message);
  }

  if (existingRequest) {
    const { data, error } = await supabase
      .from("audience_opt_in_requests")
      .update(payload)
      .eq("id", existingRequest.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      request: data,
      token,
    };
  }

  const { data, error } = await supabase
    .from("audience_opt_in_requests")
    .insert({
      ...payload,
      created_at: now,
    } satisfies TablesInsert<"audience_opt_in_requests">)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    request: data,
    token,
  };
}

/**
 * Confirms an audience opt-in token, synchronizes the contact into the
 * audience list, and marks the request as confirmed when the token is valid
 * and unexpired.
 */
export async function confirmAudienceOptInRequest(
  token: string,
): Promise<ConfirmAudienceOptInRequestResult> {
  assertServerOnly("confirmAudienceOptInRequest");

  const normalizedToken = normalizeWhitespace(token);
  if (!normalizedToken) {
    return {
      request: null,
      status: "invalid",
      success: false,
    };
  }

  const supabase = createServiceRoleClient();
  const { data: request, error } = await supabase
    .from("audience_opt_in_requests")
    .select("*")
    .eq("token_hash", hashOptInToken(normalizedToken))
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!request) {
    return {
      request: null,
      status: "invalid",
      success: false,
    };
  }

  if (request.confirmed_at) {
    return {
      request,
      status: "already_confirmed",
      success: true,
    };
  }

  if (new Date(request.expires_at).getTime() < Date.now()) {
    return {
      request,
      status: "expired",
      success: false,
    };
  }

  await syncAudienceContact({
    booksOptIn: request.books_requested,
    email: request.email,
    fullName: request.full_name,
    generalUpdatesOptIn: request.general_updates_requested,
    lessonsOptIn: request.lessons_requested,
    locale: request.locale,
    source: request.source,
  });

  const confirmedAt = new Date().toISOString();
  const { data: confirmedRequest, error: confirmError } = await supabase
    .from("audience_opt_in_requests")
    .update({
      confirmed_at: confirmedAt,
      updated_at: confirmedAt,
    } satisfies TablesUpdate<"audience_opt_in_requests">)
    .eq("id", request.id)
    .select("*")
    .single();

  if (confirmError) {
    throw new Error(confirmError.message);
  }

  return {
    request: confirmedRequest,
    status: "confirmed",
    success: true,
  };
}
