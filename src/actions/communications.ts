"use server";

import { redirect } from "next/navigation";
import * as React from "react";

import {
  AudiencePreferenceLinkEmail,
  getAudiencePreferenceLinkSubject,
} from "@/features/communications/components/AudiencePreferenceLinkEmail";
import {
  applyAudiencePreferences,
  COMMUNICATIONS_POLICY_VERSION,
} from "@/features/communications/lib/server/audience";
import { confirmAudienceOptInRequest } from "@/features/communications/lib/server/optInRequests";
import {
  applyAudiencePreferenceRequest,
  buildAudiencePreferenceUrl,
  createAudiencePreferenceRequest,
} from "@/features/communications/lib/server/preferenceRequests";
import { getProfile } from "@/features/profile/lib/server/queries";
import type { Language } from "@/lib/i18n";
import {
  getCommunicationConfirmPath,
  getCommunicationPreferencesPath,
} from "@/lib/locale";
import { queueLoggedNotificationEmail } from "@/lib/notifications/events";
import { redactEmailAddress } from "@/lib/privacy";
import {
  consumeRateLimit,
  getClientRateLimitIdentifier,
  getSensitiveRateLimitIdentifier,
  hasAvailableRateLimitProtection,
} from "@/lib/rateLimit";
import {
  revalidateAdminPaths,
  revalidateDashboardPaths,
} from "@/lib/server/revalidation";
import { getAuthenticatedServerContext } from "@/lib/supabase/auth";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/config";
import {
  getFormLanguage,
  getFormString,
  isValidEmail,
  normalizeWhitespace,
} from "@/lib/validation";

type CommunicationPreferencesState = {
  message?: string;
  success: boolean;
};

export type PreferenceLinkRequestState = {
  message: string;
  success: boolean;
};

const PREFERENCE_LINK_COPY: Record<
  Language,
  { generic: string; unavailable: string }
> = {
  en: {
    generic:
      "If that address receives Coptic Compass updates, a private preference link is on its way.",
    unavailable:
      "Preference links are temporarily unavailable. Please try again later.",
  },
  nl: {
    generic:
      "Als dat adres updates van Coptic Compass ontvangt, is er een persoonlijke voorkeurenlink onderweg.",
    unavailable:
      "Voorkeurenlinks zijn tijdelijk niet beschikbaar. Probeer het later opnieuw.",
  },
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
    await applyAudiencePreferences({
      actor: "authenticated_user",
      booksOptIn: formData.has("books_opt_in"),
      email: context.email,
      fullName:
        context.profile?.full_name ?? context.user.user_metadata?.full_name,
      generalUpdatesOptIn: formData.has("general_updates_opt_in"),
      lessonsOptIn: formData.has("lessons_opt_in"),
      locale: context.language,
      policyVersion: COMMUNICATIONS_POLICY_VERSION,
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

/**
 * Confirms a double opt-in only after an explicit form POST, then removes the
 * sensitive token from the browser URL.
 */
export async function confirmAudienceOptIn(formData: FormData): Promise<never> {
  const language = getFormLanguage(formData);
  const token = normalizeWhitespace(getFormString(formData, "token"));
  let status = "invalid";

  try {
    const result = await confirmAudienceOptInRequest(token);
    status = result.status;
  } catch (error) {
    console.error("Failed to confirm audience opt-in request", error);
  }

  const params = new URLSearchParams({ status });
  redirect(`${getCommunicationConfirmPath(language)}?${params.toString()}`);
}

async function queueAudiencePreferenceLinkEmail(options: {
  email: string;
  language: Language;
  preferenceUrl: string;
  recipientName: string | null;
  requestId: string;
}) {
  const queued = await queueLoggedNotificationEmail({
    aggregateId: options.requestId,
    aggregateType: "audience_preference_request",
    eventType: "audience_preferences_requested",
    payload: {
      email: redactEmailAddress(options.email),
      locale: options.language,
    },
    react: React.createElement(AudiencePreferenceLinkEmail, {
      language: options.language,
      preferenceUrl: options.preferenceUrl,
      recipientName: options.recipientName,
    }),
    subject: getAudiencePreferenceLinkSubject(options.language),
    text: [
      options.language === "nl"
        ? "Beheer uw Coptic Compass e-mailvoorkeuren via deze eenmalige link:"
        : "Manage your Coptic Compass email preferences with this single-use link:",
      options.preferenceUrl,
    ].join("\n"),
    to: options.email,
  });

  if (!queued.success) {
    console.error("Failed to queue audience preference link", {
      audiencePreferenceRequestId: options.requestId,
      email: redactEmailAddress(options.email),
      error: queued.error,
    });
  }
}

/**
 * Requests a no-account preference link without revealing whether the email is
 * present in the audience table.
 */
export async function requestAudiencePreferenceLink(
  _previousState: PreferenceLinkRequestState | null,
  formData: FormData,
): Promise<PreferenceLinkRequestState> {
  const language = getFormLanguage(formData);
  const copy = PREFERENCE_LINK_COPY[language];
  const email = normalizeWhitespace(
    getFormString(formData, "email"),
  ).toLowerCase();

  if (!hasSupabaseServiceRoleEnv() || !hasAvailableRateLimitProtection()) {
    return { message: copy.unavailable, success: false };
  }

  if (!isValidEmail(email)) {
    return { message: copy.generic, success: true };
  }

  try {
    const clientIdentifier = await getClientRateLimitIdentifier();
    const [clientLimit, emailLimit] = await Promise.all([
      consumeRateLimit({
        identifier: clientIdentifier,
        limit: 5,
        namespace: "audience-preferences-client",
        windowMs: 60 * 60 * 1000,
      }),
      consumeRateLimit({
        identifier: getSensitiveRateLimitIdentifier(email),
        limit: 3,
        namespace: "audience-preferences-email",
        windowMs: 60 * 60 * 1000,
      }),
    ]);

    if (!clientLimit.ok || !emailLimit.ok) {
      return { message: copy.generic, success: true };
    }

    const preferenceRequest = await createAudiencePreferenceRequest(
      email,
      language,
    );

    if (preferenceRequest) {
      const preferenceUrl = buildAudiencePreferenceUrl(
        language,
        preferenceRequest.token,
      );
      await queueAudiencePreferenceLinkEmail({
        email,
        language,
        preferenceUrl,
        recipientName: preferenceRequest.contact.full_name,
        requestId: preferenceRequest.request.id,
      });
    }
  } catch (error) {
    console.error("Failed to request audience preference link", {
      email: redactEmailAddress(email),
      error,
    });
  }

  return { message: copy.generic, success: true };
}

/** Applies a public preference change and redirects without retaining the token. */
export async function updatePublicCommunicationPreferences(
  formData: FormData,
): Promise<never> {
  const language = getFormLanguage(formData);
  const token = normalizeWhitespace(getFormString(formData, "token"));
  let status = "invalid";

  try {
    const result = await applyAudiencePreferenceRequest({
      booksOptIn: formData.has("books_opt_in"),
      generalUpdatesOptIn: formData.has("general_updates_opt_in"),
      lessonsOptIn: formData.has("lessons_opt_in"),
      token,
    });
    status = result.status;
  } catch (error) {
    console.error("Failed to update public communication preferences", error);
  }

  const params = new URLSearchParams({ status });
  redirect(`${getCommunicationPreferencesPath(language)}?${params.toString()}`);
}
