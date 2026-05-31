"use server";

import { syncAudienceContact } from "@/features/communications/lib/server/audience";
import { getProfile } from "@/features/profile/lib/server/queries";
import type { Language } from "@/lib/i18n";
import {
  revalidateAdminPaths,
  revalidateDashboardPaths,
} from "@/lib/server/revalidation";
import { getAuthenticatedServerContext } from "@/lib/supabase/auth";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/config";
import { getFormLanguage, normalizeWhitespace } from "@/lib/validation";

type CommunicationPreferencesState = {
  message?: string;
  success: boolean;
};

const COMMUNICATION_ACTION_COPY: Record<
  Language,
  {
    authRequired: string;
    saveFailed: string;
    storageUnavailable: string;
    success: string;
  }
> = {
  en: {
    authRequired: "You must be logged in to update communication preferences.",
    saveFailed: "Could not update your communication preferences.",
    storageUnavailable:
      "Could not update your communication preferences right now. Please try again later.",
    success: "Communication preferences updated.",
  },
  nl: {
    authRequired:
      "U moet ingelogd zijn om uw communicatievoorkeuren bij te werken.",
    saveFailed: "Uw communicatievoorkeuren konden niet worden bijgewerkt.",
    storageUnavailable:
      "Uw communicatievoorkeuren konden nu niet worden bijgewerkt. Probeer het later opnieuw.",
    success: "Communicatievoorkeuren bijgewerkt.",
  },
};

type CommunicationPreferenceContext =
  | {
      error: CommunicationPreferencesState;
    }
  | {
      email: string;
      language: Language;
      profile: Awaited<ReturnType<typeof getProfile>>;
      user: NonNullable<
        Awaited<ReturnType<typeof getAuthenticatedServerContext>>
      >["user"];
    };

/**
 * Loads the authenticated profile/email context required to sync communication
 * preferences, or returns the translated failure state for the action.
 */
async function getCommunicationPreferenceContext(
  formData: FormData,
): Promise<CommunicationPreferenceContext> {
  const language = getFormLanguage(formData);
  const copy = COMMUNICATION_ACTION_COPY[language];

  if (!hasSupabaseServiceRoleEnv()) {
    return {
      error: { success: false, message: copy.storageUnavailable },
    };
  }

  const authContext = await getAuthenticatedServerContext();
  if (!authContext) {
    return {
      error: { success: false, message: copy.authRequired },
    };
  }

  const profile = await getProfile(authContext.supabase, authContext.user.id);
  const email = normalizeWhitespace(
    profile?.email ?? authContext.user.email ?? "",
  );

  if (!email) {
    return {
      error: { success: false, message: copy.saveFailed },
    };
  }

  return {
    email,
    language,
    profile,
    user: authContext.user,
  };
}

export async function updateCommunicationPreferences(
  formData: FormData,
): Promise<CommunicationPreferencesState> {
  const context = await getCommunicationPreferenceContext(formData);
  if ("error" in context) {
    return context.error;
  }

  const copy = COMMUNICATION_ACTION_COPY[context.language];

  try {
    await syncAudienceContact({
      booksOptIn: formData.has("books_opt_in"),
      email: context.email,
      fullName:
        context.profile?.full_name ?? context.user.user_metadata?.full_name,
      generalUpdatesOptIn: formData.has("general_updates_opt_in"),
      lessonsOptIn: formData.has("lessons_opt_in"),
      locale: context.language,
      profileId: context.user.id,
      source: "dashboard",
    });

    revalidateDashboardPaths();
    revalidateAdminPaths();
    return { success: true, message: copy.success };
  } catch (error) {
    console.error("Failed to update communication preferences", error);
    return { success: false, message: copy.saveFailed };
  }
}
