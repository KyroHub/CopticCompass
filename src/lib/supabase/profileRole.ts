import "server-only";

import type { AppSupabaseClient } from "@/lib/supabase/queryTypes";
import type { ProfileRole } from "@/types/profile";

/**
 * Loads the stored profile role used by server-side authorization checks.
 */
export async function getProfileRole(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<ProfileRole | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error) {
    return null;
  }

  return data?.role ?? null;
}
