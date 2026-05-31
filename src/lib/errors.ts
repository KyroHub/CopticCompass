import type { Language } from "@/types/i18n";

export type AppErrorCode =
  | "auth_required"
  | "configuration_missing"
  | "external_service_unavailable"
  | "network_failed"
  | "permission_denied"
  | "rate_limited"
  | "storage_unavailable"
  | "unexpected"
  | "validation_failed";

type ErrorCopyContext =
  | "feedback"
  | "ocr"
  | "pdf"
  | "profile"
  | "profileUpload"
  | "shenute";

type ErrorCopy = Record<AppErrorCode, string>;

type PublicErrorPayload = {
  code: AppErrorCode;
  error: string;
  requestId?: string;
  success: false;
};

const DEFAULT_ERROR_COPY = {
  en: {
    auth_required: "Please sign in to continue.",
    configuration_missing: "This feature is not available right now.",
    external_service_unavailable:
      "The service is temporarily unavailable. Please try again in a moment.",
    network_failed:
      "The request could not be completed. Check your connection and try again.",
    permission_denied: "You do not have permission to do that.",
    rate_limited: "Too many attempts. Please wait a moment and try again.",
    storage_unavailable:
      "Saved account features are temporarily unavailable. Please try again later.",
    unexpected: "Something went wrong. Please try again.",
    validation_failed: "Please check the details and try again.",
  },
  nl: {
    auth_required: "Meld u aan om door te gaan.",
    configuration_missing: "Deze functie is nu niet beschikbaar.",
    external_service_unavailable:
      "De dienst is tijdelijk niet beschikbaar. Probeer het zo opnieuw.",
    network_failed:
      "Het verzoek kon niet worden voltooid. Controleer uw verbinding en probeer opnieuw.",
    permission_denied: "U hebt geen toestemming om dat te doen.",
    rate_limited: "Te veel pogingen. Wacht even en probeer opnieuw.",
    storage_unavailable:
      "Opgeslagen accountfuncties zijn tijdelijk niet beschikbaar. Probeer het later opnieuw.",
    unexpected: "Er is iets misgegaan. Probeer het opnieuw.",
    validation_failed: "Controleer de gegevens en probeer opnieuw.",
  },
} satisfies Record<Language, ErrorCopy>;

const CONTEXT_ERROR_COPY = {
  feedback: {
    en: {
      auth_required: "Please sign in to send feedback.",
      permission_denied: "You do not have permission to send this feedback.",
      storage_unavailable:
        "Feedback is temporarily unavailable. Please try again later.",
      unexpected: "Could not save feedback right now.",
      validation_failed: "Could not read this feedback. Please try again.",
    },
    nl: {
      auth_required: "Meld u aan om feedback te versturen.",
      permission_denied: "U hebt geen toestemming om deze feedback te sturen.",
      storage_unavailable:
        "Feedback is tijdelijk niet beschikbaar. Probeer het later opnieuw.",
      unexpected: "Feedback kon nu niet worden opgeslagen.",
      validation_failed:
        "Deze feedback kon niet worden gelezen. Probeer opnieuw.",
    },
  },
  ocr: {
    en: {
      external_service_unavailable:
        "OCR could not read this image right now. Please try again.",
      rate_limited:
        "Too many OCR requests. Please wait a moment and try again.",
      unexpected: "OCR could not read this image right now. Please try again.",
      validation_failed: "Please choose a readable image and try again.",
    },
    nl: {
      external_service_unavailable:
        "OCR kon deze afbeelding nu niet lezen. Probeer het opnieuw.",
      rate_limited: "Te veel OCR-verzoeken. Wacht even en probeer opnieuw.",
      unexpected: "OCR kon deze afbeelding nu niet lezen. Probeer het opnieuw.",
      validation_failed: "Kies een leesbare afbeelding en probeer het opnieuw.",
    },
  },
  pdf: {
    en: {
      unexpected: "We could not create the PDF right now. Please try again.",
    },
    nl: {
      unexpected: "De pdf kon nu niet worden gemaakt. Probeer het opnieuw.",
    },
  },
  profile: {
    en: {
      storage_unavailable:
        "Profile settings are temporarily unavailable. Please try again later.",
      unexpected: "Could not update your profile right now.",
    },
    nl: {
      storage_unavailable:
        "Profielinstellingen zijn tijdelijk niet beschikbaar. Probeer het later opnieuw.",
      unexpected: "Uw profiel kon nu niet worden bijgewerkt.",
    },
  },
  profileUpload: {
    en: {
      storage_unavailable: "Profile image uploads are temporarily unavailable.",
      unexpected: "Could not upload this image right now.",
    },
    nl: {
      storage_unavailable:
        "Profielfoto's uploaden is tijdelijk niet beschikbaar.",
      unexpected: "Deze afbeelding kon nu niet worden geupload.",
    },
  },
  shenute: {
    en: {
      auth_required: "Please sign in to access Shenute AI.",
      external_service_unavailable:
        "Shenute is having trouble answering right now. Please try again in a moment.",
      rate_limited:
        "Shenute is busy right now. Please wait a moment and try again.",
      unexpected:
        "Shenute is having trouble answering right now. Please try again in a moment.",
      validation_failed:
        "Shenute could not read that request. Please adjust it and try again.",
    },
    nl: {
      auth_required: "Meld u aan om Shenute AI te gebruiken.",
      external_service_unavailable:
        "Shenute heeft nu moeite met antwoorden. Probeer het zo opnieuw.",
      rate_limited: "Shenute is nu bezet. Wacht even en probeer het opnieuw.",
      unexpected:
        "Shenute heeft nu moeite met antwoorden. Probeer het zo opnieuw.",
      validation_failed:
        "Shenute kon dit verzoek niet lezen. Pas het aan en probeer opnieuw.",
    },
  },
} satisfies Record<
  ErrorCopyContext,
  Record<Language, Partial<Record<AppErrorCode, string>>>
>;

export function isAppErrorCode(value: unknown): value is AppErrorCode {
  return (
    value === "auth_required" ||
    value === "configuration_missing" ||
    value === "external_service_unavailable" ||
    value === "network_failed" ||
    value === "permission_denied" ||
    value === "rate_limited" ||
    value === "storage_unavailable" ||
    value === "unexpected" ||
    value === "validation_failed"
  );
}

export function getPublicErrorMessage(
  code: AppErrorCode,
  language: Language = "en",
  context?: ErrorCopyContext,
) {
  const contextCopy = context
    ? (CONTEXT_ERROR_COPY[context][language] as Partial<ErrorCopy>)
    : undefined;

  return contextCopy?.[code] ?? DEFAULT_ERROR_COPY[language][code];
}

export function getPublicErrorPayload(options: {
  code: AppErrorCode;
  context?: ErrorCopyContext;
  language?: Language;
  requestId?: string;
}): PublicErrorPayload {
  return {
    success: false as const,
    code: options.code,
    error: getPublicErrorMessage(
      options.code,
      options.language,
      options.context,
    ),
    ...(options.requestId ? { requestId: options.requestId } : {}),
  };
}

function getErrorObjectCode(error: unknown): AppErrorCode | null {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }

  const candidateCode = (error as { code?: unknown }).code;
  if (!isAppErrorCode(candidateCode)) {
    return null;
  }

  return candidateCode;
}

export function toPublicError(
  error: unknown,
  options?: {
    context?: ErrorCopyContext;
    fallbackCode?: AppErrorCode;
    language?: Language;
    requestId?: string;
  },
): PublicErrorPayload {
  let code = options?.fallbackCode ?? "unexpected";

  if (isAppErrorCode(error)) {
    code = error;
  } else {
    code = getErrorObjectCode(error) ?? code;
  }

  return getPublicErrorPayload({
    code,
    context: options?.context,
    language: options?.language,
    requestId: options?.requestId,
  });
}

function createErrorRequestId(prefix = "err") {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `${prefix}_${randomId}`;
}

export function jsonErrorResponse(options: {
  context?: ErrorCopyContext;
  error?: unknown;
  fallbackCode?: AppErrorCode;
  headers?: HeadersInit;
  language?: Language;
  publicMessage?: string;
  requestId?: string;
  requestIdPrefix?: string;
  status: number;
}) {
  const requestId =
    options.requestId ??
    (options.status >= 500
      ? createErrorRequestId(options.requestIdPrefix)
      : undefined);
  const payload = toPublicError(options.error, {
    context: options.context,
    fallbackCode: options.fallbackCode,
    language: options.language,
    requestId,
  });
  const responseHeaders = new Headers(options.headers);

  if (!responseHeaders.has("Cache-Control")) {
    responseHeaders.set("Cache-Control", "no-store");
  }

  return Response.json(
    {
      ...payload,
      ...(options.publicMessage ? { error: options.publicMessage } : {}),
    },
    {
      headers: responseHeaders,
      status: options.status,
    },
  );
}
