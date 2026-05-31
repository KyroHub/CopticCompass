"use server";

import {
  MAX_PROFILE_FULL_NAME_LENGTH,
  getAvatarStorageObjectPath,
  isValidProfileFullName,
  normalizeProfileFullName,
} from "@/features/profile/lib/profileValidation";
import { getPublicErrorMessage } from "@/lib/errors";
import { revalidateDashboardPaths } from "@/lib/server/revalidation";
import { getAuthenticatedServerContext } from "@/lib/supabase/auth";
import {
  getSupabaseRuntimeEnv,
  hasSupabaseRuntimeEnv,
} from "@/lib/supabase/config";
import { getFormLanguage } from "@/lib/validation";

type ProfileUpdateState =
  | { success: true }
  | {
      success: false;
      error: string;
    };
type ProfileUpdateFieldsResult =
  | { error: string }
  | {
      updates: {
        avatar_url?: string | null;
        full_name?: string | null;
      };
    };

/**
 * Resolves the trusted Supabase storage origin used to verify that uploaded
 * avatar URLs belong to the authenticated user's storage bucket path.
 */
function resolveSupabaseStorageOrigin() {
  const supabaseEnv = getSupabaseRuntimeEnv();
  if (!supabaseEnv) {
    return null;
  }

  try {
    return new URL(supabaseEnv.url).origin;
  } catch {
    return null;
  }
}

/**
 * Validates the profile fields this action accepts and only returns the
 * whitelisted columns that may be updated on the caller's profile row.
 */
function parseProfileUpdateFields(options: {
  formData: FormData;
  storageOrigin: string;
  userId: string;
}): ProfileUpdateFieldsResult {
  const rawFullName = options.formData.get("full_name");
  const rawAvatarUrl = options.formData.get("avatar_url");

  let fullName: string | null | undefined;
  if (rawFullName !== null) {
    if (typeof rawFullName !== "string") {
      return { error: "Full name is invalid." };
    }

    fullName = normalizeProfileFullName(rawFullName);
    if (!isValidProfileFullName(fullName)) {
      return {
        error: `Full name must be ${MAX_PROFILE_FULL_NAME_LENGTH} characters or fewer.`,
      };
    }
  }

  let avatarUrl: string | null | undefined;
  if (rawAvatarUrl !== null) {
    if (typeof rawAvatarUrl !== "string") {
      return { error: "Avatar URL is invalid." };
    }

    const trimmedAvatarUrl = rawAvatarUrl.trim();

    if (!trimmedAvatarUrl) {
      avatarUrl = null;
    } else if (
      !getAvatarStorageObjectPath(trimmedAvatarUrl, {
        storageOrigin: options.storageOrigin,
        userId: options.userId,
      })
    ) {
      return { error: "Avatar URL is invalid." };
    } else {
      avatarUrl = trimmedAvatarUrl;
    }
  }

  return {
    updates: {
      ...(fullName !== undefined && { full_name: fullName }),
      ...(avatarUrl !== undefined && { avatar_url: avatarUrl }),
    },
  };
}

/**
 * Updates the authenticated user's editable profile fields and revalidates the
 * dashboard once the profile row is successfully persisted.
 */
export async function updateProfile(
  formData: FormData,
): Promise<ProfileUpdateState> {
  const language = getFormLanguage(formData);

  if (!hasSupabaseRuntimeEnv()) {
    return {
      success: false,
      error: getPublicErrorMessage("storage_unavailable", language, "profile"),
    };
  }

  const storageOrigin = resolveSupabaseStorageOrigin();
  if (!storageOrigin) {
    return {
      success: false,
      error: getPublicErrorMessage("storage_unavailable", language, "profile"),
    };
  }

  const authContext = await getAuthenticatedServerContext();
  if (!authContext) {
    return { success: false, error: "You must be logged in." };
  }
  const { supabase, user } = authContext;
  const parseResult = parseProfileUpdateFields({
    formData,
    storageOrigin,
    userId: user.id,
  });

  if ("error" in parseResult) {
    return { success: false, error: parseResult.error };
  }

  const { updates } = parseResult;

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    console.error("Failed to update profile", {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
      userId: user.id,
    });

    return {
      success: false,
      error: getPublicErrorMessage("unexpected", language, "profile"),
    };
  }

  revalidateDashboardPaths();
  return { success: true };
}
