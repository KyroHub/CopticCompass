"use server";

import * as React from "react";

import {
  AudienceOptInConfirmationEmail,
  getAudienceOptInConfirmationSubject,
} from "@/features/communications/components/AudienceOptInConfirmationEmail";
import {
  buildAudienceOptInConfirmationUrl,
  createAudienceOptInRequest,
} from "@/features/communications/lib/server/optInRequests";
import { ContactEmailTemplate } from "@/features/contact/components/ContactEmailTemplate";
import {
  getContactInquiryLabel,
  isContactInquiryValue,
} from "@/features/contact/lib/contact";
import type { ContactInquiryValue } from "@/features/contact/lib/contact";
import { queueLoggedNotificationEmail } from "@/lib/notifications/events";
import { redactEmailAddress } from "@/lib/privacy";
import {
  consumeRateLimit,
  getClientRateLimitIdentifier,
  hasAvailableRateLimitProtection,
} from "@/lib/rateLimit";
import { withScalabilityTimer } from "@/lib/server/observability";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/config";
import { isMissingSupabaseTableError } from "@/lib/supabase/errors";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import {
  getFormLanguage,
  getFormString,
  hasLengthInRange,
  isValidEmail,
  normalizeMultiline,
  normalizeWhitespace,
} from "@/lib/validation";
import type { Language } from "@/types/i18n";

export type ContactFormState = {
  error?: string;
  message?: string;
  success: boolean;
};

const CONTACT_ACTION_COPY: Record<
  Language,
  {
    invalid: string;
    rateLimited: string;
    rateLimitUnavailable: string;
    storageUnavailable: string;
    success: string;
    successConfirmation: string;
    successConfirmationIssue: string;
    submitFailed: string;
  }
> = {
  en: {
    invalid: "Please complete all fields with valid values.",
    rateLimited:
      "Too many messages were sent from this connection. Please wait a few minutes and try again.",
    rateLimitUnavailable:
      "The contact form is temporarily unavailable. Please try again later.",
    storageUnavailable: "Contact form storage is not configured yet.",
    success: "Message sent successfully. I'll reply soon!",
    successConfirmation:
      "Message sent successfully. Check your inbox to confirm update emails.",
    successConfirmationIssue:
      "Message sent successfully, but I could not send the update confirmation email just now.",
    submitFailed: "Failed to send message. Please try again.",
  },
  nl: {
    invalid: "Vul alle velden correct in.",
    rateLimited:
      "Er zijn te veel berichten verzonden vanaf deze verbinding. Wacht even en probeer het opnieuw.",
    rateLimitUnavailable:
      "Het contactformulier is tijdelijk niet beschikbaar. Probeer het later opnieuw.",
    storageUnavailable: "De contactopslag is nog niet geconfigureerd.",
    success: "Bericht succesvol verzonden. Ik antwoord binnenkort!",
    successConfirmation:
      "Bericht succesvol verzonden. Controleer uw inbox om e-mailupdates te bevestigen.",
    successConfirmationIssue:
      "Bericht succesvol verzonden, maar ik kon de bevestigingsmail voor updates nu niet versturen.",
    submitFailed:
      "Uw bericht kon nu niet worden verzonden. Probeer het opnieuw.",
  },
};

type ContactActionCopy = (typeof CONTACT_ACTION_COPY)[Language];

type ParsedContactSubmission = {
  copy: ContactActionCopy;
  email: string;
  honeypot: string;
  inquiryType: string;
  language: Language;
  message: string;
  name: string;
  requestedTopics: {
    books: boolean;
    generalUpdates: boolean;
    lessons: boolean;
  };
  wantsUpdates: boolean;
};

/**
 * Normalizes raw contact-form input into a predictable server-side shape before
 * validation, storage, and notification side effects run.
 */
function parseContactSubmission(formData: FormData): ParsedContactSubmission {
  const language = getFormLanguage(formData);
  const requestedTopics = {
    books: formData.has("updates_books"),
    generalUpdates: formData.has("updates_general"),
    lessons: formData.has("updates_lessons"),
  };

  return {
    copy: CONTACT_ACTION_COPY[language],
    email: normalizeWhitespace(getFormString(formData, "email")).toLowerCase(),
    honeypot: normalizeWhitespace(getFormString(formData, "website")),
    inquiryType: normalizeWhitespace(getFormString(formData, "inquiryType")),
    language,
    message: normalizeMultiline(getFormString(formData, "message")),
    name: normalizeWhitespace(getFormString(formData, "name")),
    requestedTopics,
    wantsUpdates: Object.values(requestedTopics).some(Boolean),
  };
}

/**
 * Applies the contact-form guardrails in one place, including the honeypot
 * spam bypass and the service-role/storage checks needed before persistence.
 */
function validateContactSubmission(
  submission: ParsedContactSubmission,
): ContactFormState | null {
  if (submission.honeypot) {
    return { success: true };
  }

  if (!hasSupabaseServiceRoleEnv()) {
    return { success: false, error: submission.copy.storageUnavailable };
  }

  if (
    !hasLengthInRange(submission.name, { min: 1, max: 100 }) ||
    !isValidEmail(submission.email) ||
    !isContactInquiryValue(submission.inquiryType) ||
    !hasLengthInRange(submission.message, { min: 5, max: 5000 })
  ) {
    return {
      success: false,
      error: submission.copy.invalid,
    };
  }

  return null;
}

/**
 * Consumes one contact-form rate-limit token and returns a user-facing state
 * instead of throwing so the action can fail gracefully when protection is
 * unavailable or the caller is temporarily blocked.
 */
async function enforceContactRateLimit(
  copy: ContactActionCopy,
): Promise<ContactFormState | null> {
  if (!hasAvailableRateLimitProtection()) {
    return {
      success: false,
      error: copy.rateLimitUnavailable,
    };
  }

  const clientIdentifier = await getClientRateLimitIdentifier();
  const contactRateLimit = await consumeRateLimit({
    identifier: clientIdentifier,
    limit: 3,
    namespace: "contact",
    windowMs: 15 * 60 * 1000,
  });

  if (!contactRateLimit.ok) {
    return {
      success: false,
      error: copy.rateLimited,
    };
  }

  return null;
}

/**
 * Notifies the site owner about a stored contact submission. The action treats
 * this as a best-effort side effect and logs failures without blocking success.
 */
async function sendContactOwnerNotification(options: {
  contactMessageId: string | null;
  email: string;
  inquiryLabel: string;
  inquiryType: string;
  language: Language;
  message: string;
  name: string;
  wantsUpdates: boolean;
}) {
  if (!process.env.CONTACT_EMAIL || !options.contactMessageId) {
    return;
  }

  const notificationResult = await queueLoggedNotificationEmail({
    aggregateId: options.contactMessageId,
    aggregateType: "contact_message",
    eventType: "contact_message_received",
    payload: {
      inquiry_type: options.inquiryType,
      locale: options.language,
      sender_email: redactEmailAddress(options.email),
      wants_updates: options.wantsUpdates,
    },
    to: process.env.CONTACT_EMAIL,
    replyTo: options.email,
    subject: `Coptic Compass contact: ${options.inquiryLabel} from ${options.name}`,
    react: React.createElement(ContactEmailTemplate, {
      name: options.name,
      email: options.email,
      inquiryLabel: options.inquiryLabel,
      message: options.message,
    }),
    text: [
      `Name: ${options.name}`,
      `Email: ${options.email}`,
      `Type: ${options.inquiryLabel}`,
      `Locale: ${options.language}`,
      `Wants updates: ${options.wantsUpdates ? "yes" : "no"}`,
      "",
      "Message:",
      options.message,
    ].join("\n"),
  });

  if (!notificationResult.success) {
    console.error("Failed to send contact alert email", {
      contactMessageId: options.contactMessageId,
      error: notificationResult.error,
      email: redactEmailAddress(options.email),
      inquiryType: options.inquiryType,
    });
  }
}

/**
 * Creates the opt-in request and sends the double opt-in email for visitors
 * who asked for updates from the contact form. Contact submission success is
 * preserved even when the opt-in request or email delivery fails.
 */
async function sendContactUpdatesConfirmation(options: {
  copy: ContactActionCopy;
  email: string;
  language: Language;
  name: string;
  requestedTopics: ParsedContactSubmission["requestedTopics"];
}) {
  try {
    const { request, token } = await createAudienceOptInRequest({
      booksRequested: options.requestedTopics.books,
      email: options.email,
      fullName: options.name,
      generalUpdatesRequested: options.requestedTopics.generalUpdates,
      lessonsRequested: options.requestedTopics.lessons,
      locale: options.language,
      source: "contact_form",
    });

    const confirmationUrl = buildAudienceOptInConfirmationUrl(
      options.language,
      token,
    );
    const confirmationResult = await queueLoggedNotificationEmail({
      aggregateId: request.id,
      aggregateType: "audience_opt_in_request",
      eventType: "audience_opt_in_requested",
      payload: {
        email: redactEmailAddress(options.email),
        locale: options.language,
        source: "contact_form",
        topics: {
          books: options.requestedTopics.books,
          general_updates: options.requestedTopics.generalUpdates,
          lessons: options.requestedTopics.lessons,
        },
      },
      to: options.email,
      subject: getAudienceOptInConfirmationSubject(options.language),
      react: React.createElement(AudienceOptInConfirmationEmail, {
        confirmationUrl,
        language: options.language,
        recipientName: options.name,
        requestedTopics: options.requestedTopics,
      }),
      text: [
        options.language === "nl"
          ? "Bevestig uw Coptic Compass e-mailupdates via deze link:"
          : "Confirm your Coptic Compass email updates with this link:",
        confirmationUrl,
        "",
        options.language === "nl"
          ? "Hebt u dit niet aangevraagd, dan kunt u deze e-mail gerust negeren."
          : "If you did not request this, you can safely ignore this email.",
      ].join("\n"),
    });

    if (!confirmationResult.success) {
      console.error("Failed to send audience opt-in confirmation email", {
        audienceOptInRequestId: request.id,
        email: redactEmailAddress(options.email),
        error: confirmationResult.error,
        locale: options.language,
      });
    }

    return confirmationResult.success
      ? options.copy.successConfirmation
      : options.copy.successConfirmationIssue;
  } catch (error) {
    console.error(
      "Failed to create audience opt-in request from contact form",
      {
        email: redactEmailAddress(options.email),
        error,
        name: options.name,
      },
    );
    return options.copy.successConfirmationIssue;
  }
}

function summarizeContactFormState(state: ContactFormState) {
  let outcome = "error";

  if (state.success) {
    outcome = state.message ? "success" : "filtered";
  }

  return {
    outcome,
    success: state.success,
  };
}

async function processStoredContactSubmission(
  submission: ParsedContactSubmission,
  inquiryType: ContactInquiryValue,
): Promise<ContactFormState> {
  try {
    const supabase = createServiceRoleClient();
    const { data: contactMessage, error } = await supabase
      .from("contact_messages")
      .insert({
        name: submission.name,
        email: submission.email,
        inquiry_type: inquiryType,
        message: submission.message,
        locale: submission.language,
        wants_updates: submission.wantsUpdates,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to store contact message", {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message,
      });

      if (isMissingSupabaseTableError(error)) {
        return { success: false, error: submission.copy.storageUnavailable };
      }

      return { success: false, error: submission.copy.submitFailed };
    }

    const inquiryLabel = getContactInquiryLabel(inquiryType);
    await sendContactOwnerNotification({
      contactMessageId: contactMessage?.id ?? null,
      email: submission.email,
      inquiryLabel,
      inquiryType,
      language: submission.language,
      message: submission.message,
      name: submission.name,
      wantsUpdates: submission.wantsUpdates,
    });

    const successMessage = submission.wantsUpdates
      ? await sendContactUpdatesConfirmation({
          copy: submission.copy,
          email: submission.email,
          language: submission.language,
          name: submission.name,
          requestedTopics: submission.requestedTopics,
        })
      : submission.copy.success;

    return {
      success: true,
      message: successMessage,
    };
  } catch (error) {
    console.error("Failed to handle contact message", error);
    return { success: false, error: submission.copy.submitFailed };
  }
}

/**
 * Persists a contact submission, sends the owner alert, and optionally starts
 * the audience opt-in flow. Notification failures are treated as non-blocking
 * so a successfully stored message can still return success to the visitor.
 */
export async function sendContactEmail(
  _prevState: ContactFormState | null,
  formData: FormData,
): Promise<ContactFormState> {
  const submission = parseContactSubmission(formData);
  return withScalabilityTimer(
    "action.contact.send_contact_email",
    async () => {
      const validationState = validateContactSubmission(submission);

      if (validationState) {
        return validationState;
      }

      const rateLimitState = await enforceContactRateLimit(submission.copy);
      if (rateLimitState) {
        return rateLimitState;
      }

      const inquiryType = submission.inquiryType as ContactInquiryValue;
      return processStoredContactSubmission(submission, inquiryType);
    },
    {
      metadata: {
        honeypotFilled: Boolean(submission.honeypot),
        inquiryType: submission.inquiryType,
        language: submission.language,
        wantsUpdates: submission.wantsUpdates,
      },
      summarizeResult: summarizeContactFormState,
    },
  );
}
