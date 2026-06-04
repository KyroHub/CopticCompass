import { hasAudienceSubscriptions } from "@/features/communications/lib/communications";
import { isLanguage, type Language } from "@/lib/i18n";
import { redactEmailAddress } from "@/lib/privacy";
import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { normalizeWhitespace } from "@/lib/validation";
import type { Tables, TablesInsert } from "@/types/supabase";

import { syncStoredAudienceContactToResend } from "./resend";

type AudienceContactInsert = TablesInsert<"audience_contacts">;
type AudienceContactRow = Tables<"audience_contacts">;

interface SyncAudienceContactInput {
  booksOptIn: boolean;
  email: string;
  fullName?: string | null;
  generalUpdatesOptIn: boolean;
  lessonsOptIn: boolean;
  locale?: Language | null;
  profileId?: string | null;
  source: AudienceContactInsert["source"];
}

/**
 * Normalizes optional audience-contact names so blank submissions are stored as
 * null instead of as whitespace-only strings.
 */
function normalizeAudienceFullName(value?: string | null) {
  const normalized = normalizeWhitespace(value ?? "");
  return normalized.length > 0 ? normalized : null;
}

function normalizeAudienceEmail(email: string) {
  return normalizeWhitespace(email).toLowerCase();
}

function normalizeAudienceLocale(locale?: Language | null) {
  return locale && isLanguage(locale) ? locale : "en";
}

/**
 * Synchronizes the stored contact to Resend but falls back to returning the
 * saved Supabase row when provider sync fails unexpectedly.
 */
async function syncAudienceContactToResendOrReturn(
  contact: AudienceContactRow,
  supabase: ReturnType<typeof createServiceRoleClient>,
) {
  try {
    const resendSyncResult = await syncStoredAudienceContactToResend(
      contact,
      supabase,
    );
    if (!resendSyncResult.success) {
      console.error("Failed to sync audience contact to Resend", {
        audienceContactId: contact.id,
        email: redactEmailAddress(contact.email),
        error: resendSyncResult.error,
      });
    }

    return resendSyncResult.contact;
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
 * Updates an existing audience contact or inserts a new one, always returning
 * the stored Supabase row used for later provider sync.
 */
async function saveAudienceContact(options: {
  existingContact: AudienceContactRow | null;
  payload: AudienceContactInsert;
  supabase: ReturnType<typeof createServiceRoleClient>;
  now: string;
}) {
  if (options.existingContact) {
    const { data, error } = await options.supabase
      .from("audience_contacts")
      .update(options.payload)
      .eq("id", options.existingContact.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  const { data, error } = await options.supabase
    .from("audience_contacts")
    .insert({
      ...options.payload,
      created_at: options.now,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Preserves the first consent timestamp once a contact has subscribed, while
 * leaving non-subscribed contacts without a new consent marker.
 */
function getAudienceContactConsentedAt(options: {
  existingContact: AudienceContactRow | null;
  isSubscribed: boolean;
  now: string;
}) {
  if (!options.isSubscribed) {
    return options.existingContact?.consented_at ?? null;
  }

  return options.existingContact?.consented_at ?? options.now;
}

/**
 * Records the unsubscribe timestamp only while the contact has no active
 * audience subscriptions.
 */
function getAudienceContactUnsubscribedAt(options: {
  isSubscribed: boolean;
  now: string;
}) {
  return options.isSubscribed ? null : options.now;
}

/**
 * Builds the audience-contact payload that reconciles normalized preferences,
 * consent timing, and any previously stored profile/name data.
 */
function buildAudienceContactPayload(options: {
  booksOptIn: boolean;
  existingContact: AudienceContactRow | null;
  generalUpdatesOptIn: boolean;
  lessonsOptIn: boolean;
  locale: Language;
  now: string;
  normalizedEmail: string;
  normalizedFullName: string | null;
  profileId?: string | null;
  source: AudienceContactInsert["source"];
}): AudienceContactInsert {
  const nextPreferences = {
    booksOptIn: options.booksOptIn,
    generalUpdatesOptIn: options.generalUpdatesOptIn,
    lessonsOptIn: options.lessonsOptIn,
    locale: options.locale,
  };
  const isSubscribed = hasAudienceSubscriptions(nextPreferences);

  return {
    books_opt_in: options.booksOptIn,
    consented_at: getAudienceContactConsentedAt({
      existingContact: options.existingContact,
      isSubscribed,
      now: options.now,
    }),
    email: options.normalizedEmail,
    full_name:
      options.normalizedFullName ?? options.existingContact?.full_name ?? null,
    general_updates_opt_in: options.generalUpdatesOptIn,
    lessons_opt_in: options.lessonsOptIn,
    locale: options.locale,
    profile_id:
      options.profileId ?? options.existingContact?.profile_id ?? null,
    source: options.source,
    unsubscribed_at: getAudienceContactUnsubscribedAt({
      isSubscribed,
      now: options.now,
    }),
    updated_at: options.now,
  };
}

/**
 * Upserts the local audience-contact record and then attempts to synchronize it
 * to Resend so the provider-side audience reflects the latest opt-in state.
 */
export async function syncAudienceContact({
  booksOptIn,
  email,
  fullName,
  generalUpdatesOptIn,
  lessonsOptIn,
  locale,
  profileId,
  source,
}: SyncAudienceContactInput) {
  const normalizedEmail = normalizeAudienceEmail(email);
  const normalizedFullName = normalizeAudienceFullName(fullName);
  const normalizedLocale = normalizeAudienceLocale(locale);

  const supabase = createServiceRoleClient();
  const { data: existingContact, error: existingContactError } = await supabase
    .from("audience_contacts")
    .select("*")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingContactError) {
    throw new Error(existingContactError.message);
  }

  const now = new Date().toISOString();
  const payload = buildAudienceContactPayload({
    booksOptIn,
    existingContact,
    generalUpdatesOptIn,
    lessonsOptIn,
    locale: normalizedLocale,
    normalizedEmail,
    normalizedFullName,
    now,
    profileId,
    source,
  });
  const savedContact = await saveAudienceContact({
    existingContact,
    now,
    payload,
    supabase,
  });

  return syncAudienceContactToResendOrReturn(savedContact, supabase);
}
