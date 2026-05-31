import { Resend } from "resend";

import { hasAudienceSubscriptions } from "@/features/communications/lib/communications";
import { assertServerOnly } from "@/lib/server/assertServerOnly";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

type AudienceContactRow = Tables<"audience_contacts">;
type AudienceContactSyncStateRow = Tables<"audience_contact_sync_state">;
type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;
type ResendContactLookup = Awaited<ReturnType<Resend["contacts"]["get"]>>;
type ResendContactUpsert = {
  contactId: string;
  segmentsAppliedOnCreate: boolean;
};

type ResendAudienceSegments = {
  books: string;
  general: string;
  lessons: string;
};

type ResendLocalizedAudienceSegments = {
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

type ResendAudienceEnv = {
  resendApiKey: string;
  localizedSegments: ResendLocalizedAudienceSegments;
  segments: ResendAudienceSegments;
};

type ResendAudienceSyncResult =
  | {
      contact: AudienceContactRow;
      syncState: AudienceContactSyncStateRow | null;
      skipped: true;
      success: true;
    }
  | {
      contact: AudienceContactRow;
      syncState: AudienceContactSyncStateRow | null;
      success: true;
    }
  | {
      contact: AudienceContactRow;
      error: string;
      syncState: AudienceContactSyncStateRow | null;
      success: false;
    };

/**
 * Loads the Resend audience sync configuration from environment variables.
 * Returns null when the required global segment ids are missing so callers can
 * skip syncing instead of partially managing contacts against an incomplete
 * segment map.
 */
function getResendAudienceEnv(): ResendAudienceEnv | null {
  assertServerOnly("getResendAudienceEnv");

  const resendApiKey = process.env.RESEND_API_KEY_FULL_ACCESS;
  const lessons = process.env.RESEND_LESSONS_SEGMENT_ID;
  const books = process.env.RESEND_BOOKS_SEGMENT_ID;
  const general = process.env.RESEND_GENERAL_SEGMENT_ID;
  const lessonsEn = normalizeOptionalSegmentId(
    process.env.RESEND_LESSONS_EN_SEGMENT_ID,
  );
  const lessonsNl = normalizeOptionalSegmentId(
    process.env.RESEND_LESSONS_NL_SEGMENT_ID,
  );
  const booksEn = normalizeOptionalSegmentId(
    process.env.RESEND_BOOKS_EN_SEGMENT_ID,
  );
  const booksNl = normalizeOptionalSegmentId(
    process.env.RESEND_BOOKS_NL_SEGMENT_ID,
  );
  const generalEn = normalizeOptionalSegmentId(
    process.env.RESEND_GENERAL_EN_SEGMENT_ID,
  );
  const generalNl = normalizeOptionalSegmentId(
    process.env.RESEND_GENERAL_NL_SEGMENT_ID,
  );

  if (!resendApiKey || !lessons || !books || !general) {
    return null;
  }

  return {
    localizedSegments: {
      books: {
        en: booksEn,
        nl: booksNl,
      },
      general: {
        en: generalEn,
        nl: generalNl,
      },
      lessons: {
        en: lessonsEn,
        nl: lessonsNl,
      },
    },
    resendApiKey,
    segments: {
      books,
      general,
      lessons,
    },
  };
}

/**
 * Indicates whether the app has enough Resend configuration to manage audience
 * contacts and their segment assignments.
 */
export function hasResendAudienceEnv() {
  return getResendAudienceEnv() !== null;
}

async function persistSuccessfulResendSyncState(options: {
  audienceContactId: string;
  contactId: string;
  supabase: ServiceRoleClient;
}) {
  return persistAudienceContactSyncState(
    options.audienceContactId,
    {
      last_error: null,
      last_synced_at: new Date().toISOString(),
      provider: "resend",
      provider_contact_id: options.contactId,
    },
    options.supabase,
  );
}

async function persistFailedResendSyncState(options: {
  audienceContactId: string;
  errorMessage: string;
  supabase: ServiceRoleClient;
}) {
  return persistAudienceContactSyncState(
    options.audienceContactId,
    {
      last_error: options.errorMessage,
      provider: "resend",
    },
    options.supabase,
  );
}

async function syncManagedResendSegments(options: {
  contactId: string;
  desiredSegmentIds: Set<string>;
  managedSegmentIds: Set<string>;
  resend: Resend;
}) {
  const { data: currentSegments, error: currentSegmentsError } =
    await options.resend.contacts.segments.list({
      contactId: options.contactId,
    });

  if (currentSegmentsError) {
    throw new Error(currentSegmentsError.message);
  }

  const existingSegmentIds = new Set(
    (currentSegments?.data ?? [])
      .map((segment) => segment.id)
      .filter((segmentId) => options.managedSegmentIds.has(segmentId)),
  );

  for (const segmentId of options.desiredSegmentIds) {
    if (!existingSegmentIds.has(segmentId)) {
      const { error } = await options.resend.contacts.segments.add({
        contactId: options.contactId,
        segmentId,
      });

      if (error) {
        throw new Error(error.message);
      }
    }
  }

  for (const segmentId of existingSegmentIds) {
    if (!options.desiredSegmentIds.has(segmentId)) {
      const { error } = await options.resend.contacts.segments.remove({
        contactId: options.contactId,
        segmentId,
      });

      if (error) {
        throw new Error(error.message);
      }
    }
  }
}

/**
 * Synchronizes one stored audience contact to Resend and records the resulting
 * sync state in Supabase. Missing configuration is treated as a skipped success
 * so admin tools can distinguish "not configured" from actual sync failures.
 */
export async function syncStoredAudienceContactToResend(
  contact: AudienceContactRow,
  supabase?: ServiceRoleClient,
): Promise<ResendAudienceSyncResult> {
  const env = getResendAudienceEnv();
  if (!env) {
    const syncState = await getAudienceContactSyncState(contact.id, supabase);
    return {
      contact,
      syncState,
      skipped: true,
      success: true,
    };
  }

  const serviceRoleClient = supabase ?? createServiceRoleClient();
  const existingSyncState = await getAudienceContactSyncState(
    contact.id,
    serviceRoleClient,
  );
  const resend = new Resend(env.resendApiKey);
  const { firstName, lastName } = splitAudienceFullName(contact.full_name);
  const managedSegmentIds = getManagedSegmentIds(env);
  const desiredSegmentIds = getDesiredSegmentIds(contact, env);
  const desiredSegmentList = [...desiredSegmentIds];

  try {
    const upsertedContact = await upsertResendContact({
      contact,
      desiredSegmentIds: desiredSegmentList,
      firstName,
      lastName,
      existingSyncState,
      resend,
    });
    const contactId = upsertedContact.contactId;

    if (upsertedContact.segmentsAppliedOnCreate) {
      const syncState = await persistSuccessfulResendSyncState({
        audienceContactId: contact.id,
        contactId,
        supabase: serviceRoleClient,
      });

      return {
        contact,
        syncState,
        success: true,
      };
    }

    await syncManagedResendSegments({
      contactId,
      desiredSegmentIds,
      managedSegmentIds,
      resend,
    });
    const syncState = await persistSuccessfulResendSyncState({
      audienceContactId: contact.id,
      contactId,
      supabase: serviceRoleClient,
    });

    return {
      contact,
      syncState,
      success: true,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Audience contact sync failed.";

    const syncState = await persistFailedResendSyncState({
      audienceContactId: contact.id,
      errorMessage,
      supabase: serviceRoleClient,
    });

    return {
      contact,
      error: errorMessage,
      syncState,
      success: false,
    };
  }
}

/**
 * Returns the full set of Resend segment ids owned by this application,
 * including optional locale-specific segments, so sync can remove stale managed
 * memberships without touching unrelated manual segments.
 */
function getManagedSegmentIds(
  env: Pick<ResendAudienceEnv, "localizedSegments" | "segments">,
) {
  const segmentIds = [
    env.segments.lessons,
    env.segments.books,
    env.segments.general,
    env.localizedSegments.lessons.en,
    env.localizedSegments.lessons.nl,
    env.localizedSegments.books.en,
    env.localizedSegments.books.nl,
    env.localizedSegments.general.en,
    env.localizedSegments.general.nl,
  ].filter((segmentId): segmentId is string => Boolean(segmentId));

  return new Set(segmentIds);
}

/**
 * Computes the segments a contact should belong to based on their opt-ins and
 * preferred locale. Locale-specific segments are added only when configured.
 */
function getDesiredSegmentIds(
  contact: Pick<
    AudienceContactRow,
    "books_opt_in" | "general_updates_opt_in" | "lessons_opt_in" | "locale"
  >,
  env: Pick<ResendAudienceEnv, "localizedSegments" | "segments">,
) {
  const desiredSegmentIds = new Set<string>();
  const preferredLocale = contact.locale === "nl" ? "nl" : "en";

  if (contact.lessons_opt_in) {
    desiredSegmentIds.add(env.segments.lessons);
    const localizedSegmentId = env.localizedSegments.lessons[preferredLocale];
    if (localizedSegmentId) {
      desiredSegmentIds.add(localizedSegmentId);
    }
  }

  if (contact.books_opt_in) {
    desiredSegmentIds.add(env.segments.books);
    const localizedSegmentId = env.localizedSegments.books[preferredLocale];
    if (localizedSegmentId) {
      desiredSegmentIds.add(localizedSegmentId);
    }
  }

  if (contact.general_updates_opt_in) {
    desiredSegmentIds.add(env.segments.general);
    const localizedSegmentId = env.localizedSegments.general[preferredLocale];
    if (localizedSegmentId) {
      desiredSegmentIds.add(localizedSegmentId);
    }
  }

  return desiredSegmentIds;
}

async function lookupExistingResendContact(options: {
  contact: AudienceContactRow;
  existingSyncState: AudienceContactSyncStateRow | null;
  resend: Resend;
}): Promise<ResendContactLookup> {
  if (options.existingSyncState?.provider_contact_id) {
    return options.resend.contacts.get({
      id: options.existingSyncState.provider_contact_id,
    });
  }

  return options.resend.contacts.get({
    email: options.contact.email,
  });
}

async function updateExistingResendContact(options: {
  contact: AudienceContactRow;
  contactId: string;
  firstName: string | null;
  lastName: string | null;
  resend: Resend;
  unsubscribed: boolean;
}): Promise<ResendContactUpsert> {
  const updatedContact = await options.resend.contacts.update({
    email: options.contact.email,
    firstName: options.firstName,
    lastName: options.lastName,
    unsubscribed: options.unsubscribed,
  });

  if (updatedContact.error) {
    throw new Error(updatedContact.error.message);
  }

  return {
    contactId: options.contactId,
    segmentsAppliedOnCreate: false,
  };
}

async function createResendContact(options: {
  contact: AudienceContactRow;
  desiredSegmentIds: string[];
  firstName: string | null;
  lastName: string | null;
  resend: Resend;
  unsubscribed: boolean;
}): Promise<ResendContactUpsert> {
  const createdContact = await options.resend.contacts.create({
    email: options.contact.email,
    firstName: options.firstName ?? undefined,
    lastName: options.lastName ?? undefined,
    segments: options.desiredSegmentIds.map((id) => ({ id })),
    unsubscribed: options.unsubscribed,
  });

  if (!createdContact.error && createdContact.data?.id) {
    return {
      contactId: createdContact.data.id,
      segmentsAppliedOnCreate: true,
    };
  }

  throw new Error(
    createdContact.error?.message ?? "Resend contact sync failed.",
  );
}

async function upsertResendContact(options: {
  contact: AudienceContactRow;
  desiredSegmentIds: string[];
  existingSyncState: AudienceContactSyncStateRow | null;
  firstName: string | null;
  lastName: string | null;
  resend: Resend;
}) {
  const unsubscribed = !hasAudienceSubscriptions(options.contact);
  const existingContactLookup = await lookupExistingResendContact({
    contact: options.contact,
    existingSyncState: options.existingSyncState,
    resend: options.resend,
  });

  if (!existingContactLookup.error && existingContactLookup.data?.id) {
    return updateExistingResendContact({
      contact: options.contact,
      contactId: existingContactLookup.data.id,
      firstName: options.firstName,
      lastName: options.lastName,
      resend: options.resend,
      unsubscribed,
    });
  }

  if (
    existingContactLookup.error &&
    existingContactLookup.error.name !== "not_found"
  ) {
    throw new Error(existingContactLookup.error.message);
  }

  return createResendContact({
    contact: options.contact,
    desiredSegmentIds: options.desiredSegmentIds,
    firstName: options.firstName,
    lastName: options.lastName,
    resend: options.resend,
    unsubscribed,
  });
}

/**
 * Upserts the local sync-state row for a contact. This keeps the last known
 * provider contact id and any failure details in one place for later retries.
 */
async function persistAudienceContactSyncState(
  audienceContactId: string,
  payload: Omit<
    TablesUpdate<"audience_contact_sync_state">,
    "audience_contact_id"
  >,
  supabase: ServiceRoleClient,
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("audience_contact_sync_state")
    .upsert(
      {
        audience_contact_id: audienceContactId,
        ...payload,
        updated_at: now,
      } satisfies TablesInsert<"audience_contact_sync_state">,
      {
        onConflict: "audience_contact_id",
      },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Loads the previous sync-state row for a contact so retries can reuse the
 * last known provider contact id when available.
 */
async function getAudienceContactSyncState(
  audienceContactId: string,
  supabase?: ServiceRoleClient,
) {
  const serviceRoleClient = supabase ?? createServiceRoleClient();
  const { data, error } = await serviceRoleClient
    .from("audience_contact_sync_state")
    .select("*")
    .eq("audience_contact_id", audienceContactId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function splitAudienceFullName(fullName: string | null) {
  const normalized = (fullName ?? "").trim();
  if (!normalized) {
    return {
      firstName: null,
      lastName: null,
    };
  }

  const [firstName, ...rest] = normalized.split(/\s+/);
  return {
    firstName,
    lastName: rest.length > 0 ? rest.join(" ") : null,
  };
}

function normalizeOptionalSegmentId(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
