import type { AudiencePreferencesRow } from "@/features/communications/lib/communications";
import type { AppSupabaseClient } from "@/lib/supabase/queryTypes";
import type { Tables } from "@/types/supabase";

const AUDIENCE_CONTACT_PREFERENCES_SELECT =
  "id, email, locale, source, books_opt_in, general_updates_opt_in, lessons_opt_in, profile_id";

/**
 * Loads the current profile row for the authenticated user.
 */
export async function getProfile(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<Tables<"profiles"> | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Resolves the audience-contact preferences associated with a profile, first
 * by direct profile link and then by normalized email as a fallback.
 */
export async function getAudienceContactForProfile(
  supabase: AppSupabaseClient,
  userId: string,
  email?: string | null,
): Promise<AudiencePreferencesRow | null> {
  const profileLinkedResult = await supabase
    .from("audience_contacts")
    .select(AUDIENCE_CONTACT_PREFERENCES_SELECT)
    .eq("profile_id", userId)
    .maybeSingle();

  if (profileLinkedResult.error) {
    return null;
  }

  if (profileLinkedResult.data) {
    return profileLinkedResult.data;
  }

  if (!email) {
    return null;
  }

  const { data, error } = await supabase
    .from("audience_contacts")
    .select(AUDIENCE_CONTACT_PREFERENCES_SELECT)
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}
