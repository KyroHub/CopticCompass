export type BroadcastSegmentMap = {
  books: string | null;
  general: string | null;
  lessons: string | null;
};

export type BroadcastTopicMap = {
  books: string;
  general: string;
  lessons: string;
};

export type LocalizedBroadcastSegmentMap = {
  books: {
    en: string | null;
    nl: string | null;
  };
  general: {
    en: string | null;
    nl: string | null;
  };
  lessons: {
    en: string | null;
    nl: string | null;
  };
};

export type ResendBroadcastEnv = {
  localizedSegments: LocalizedBroadcastSegmentMap;
  resendApiKey: string;
  segments: BroadcastSegmentMap;
  topics: BroadcastTopicMap;
};

type ProcessContentReleaseEnv = {
  notificationFromEmail: string;
  resendApiKey: string;
  serviceRoleKey: string;
  supabaseUrl: string;
};

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};

export function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
    status,
  });
}

function normalizeOptionalEnvValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

/**
 * Loads the required environment for the per-recipient release worker.
 * Returning null lets the request handler fail fast before touching Supabase or
 * the email provider when any mandatory secret is missing.
 */
export function getProcessContentReleaseEnv(): ProcessContentReleaseEnv | null {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey =
    Deno.env.get("RESEND_API_KEY") ??
    Deno.env.get("RESEND_API_KEY_FULL_ACCESS");
  const notificationFromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL");

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !resendApiKey ||
    !notificationFromEmail
  ) {
    return null;
  }

  return {
    notificationFromEmail,
    resendApiKey,
    serviceRoleKey,
    supabaseUrl,
  };
}

/**
 * Loads the required broadcast configuration. Returning null blocks release
 * sending because marketing delivery must use Resend Broadcasts, Segments, and
 * Topics rather than direct per-recipient Email API calls.
 */
export function getResendBroadcastEnv(): ResendBroadcastEnv | null {
  const resendApiKey = normalizeOptionalEnvValue(
    Deno.env.get("RESEND_API_KEY_FULL_ACCESS"),
  );
  const lessons = normalizeOptionalEnvValue(
    Deno.env.get("RESEND_LESSONS_SEGMENT_ID"),
  );
  const books = normalizeOptionalEnvValue(
    Deno.env.get("RESEND_BOOKS_SEGMENT_ID"),
  );
  const general = normalizeOptionalEnvValue(
    Deno.env.get("RESEND_GENERAL_SEGMENT_ID"),
  );
  const lessonsTopic = normalizeOptionalEnvValue(
    Deno.env.get("RESEND_LESSONS_TOPIC_ID"),
  );
  const booksTopic = normalizeOptionalEnvValue(
    Deno.env.get("RESEND_BOOKS_TOPIC_ID"),
  );
  const generalTopic = normalizeOptionalEnvValue(
    Deno.env.get("RESEND_GENERAL_TOPIC_ID"),
  );

  if (
    !resendApiKey ||
    !lessons ||
    !books ||
    !general ||
    !lessonsTopic ||
    !booksTopic ||
    !generalTopic
  ) {
    return null;
  }

  return {
    localizedSegments: {
      books: {
        en: normalizeOptionalEnvValue(
          Deno.env.get("RESEND_BOOKS_EN_SEGMENT_ID"),
        ),
        nl: normalizeOptionalEnvValue(
          Deno.env.get("RESEND_BOOKS_NL_SEGMENT_ID"),
        ),
      },
      general: {
        en: normalizeOptionalEnvValue(
          Deno.env.get("RESEND_GENERAL_EN_SEGMENT_ID"),
        ),
        nl: normalizeOptionalEnvValue(
          Deno.env.get("RESEND_GENERAL_NL_SEGMENT_ID"),
        ),
      },
      lessons: {
        en: normalizeOptionalEnvValue(
          Deno.env.get("RESEND_LESSONS_EN_SEGMENT_ID"),
        ),
        nl: normalizeOptionalEnvValue(
          Deno.env.get("RESEND_LESSONS_NL_SEGMENT_ID"),
        ),
      },
    },
    resendApiKey,
    segments: {
      books,
      general,
      lessons,
    },
    topics: {
      books: booksTopic,
      general: generalTopic,
      lessons: lessonsTopic,
    },
  };
}
