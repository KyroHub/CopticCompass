import {
  compareAudienceContactPriority,
  hasAudienceSubscriptions,
  type AdminAudienceContactRow,
} from "@/features/communications/lib/communications";
import {
  compareContentReleasePriority,
  type AdminContentRelease,
  type ContentReleaseItemRow,
  type ContentReleaseTargetRow,
} from "@/features/communications/lib/releases";
import type { AppSupabaseClient, QueryResult } from "@/lib/supabase/queryTypes";

const ADMIN_AUDIENCE_INACTIVE_HISTORY_LIMIT = 50;
const ADMIN_CONTENT_RELEASE_HISTORY_LIMIT = 12;

function compareAdminAudienceContactPriority(
  left: AdminAudienceContactRow,
  right: AdminAudienceContactRow,
) {
  const leftHasSyncError = Boolean(left.syncState?.last_error);
  const rightHasSyncError = Boolean(right.syncState?.last_error);

  if (leftHasSyncError !== rightHasSyncError) {
    return Number(rightHasSyncError) - Number(leftHasSyncError);
  }

  const leftHasSubscriptions = hasAudienceSubscriptions(left);
  const rightHasSubscriptions = hasAudienceSubscriptions(right);

  if (leftHasSubscriptions !== rightHasSubscriptions) {
    return Number(rightHasSubscriptions) - Number(leftHasSubscriptions);
  }

  return compareAudienceContactPriority(left, right);
}

/**
 * Loads all actionable audience contacts plus a capped recent inactive window,
 * then joins each contact with its latest Resend sync state.
 */
export async function getAdminAudienceContacts(
  supabase: AppSupabaseClient,
  limit = ADMIN_AUDIENCE_INACTIVE_HISTORY_LIMIT,
): Promise<QueryResult<AdminAudienceContactRow[]>> {
  const [
    subscribedContactsResult,
    erroredSyncStatesResult,
    inactiveContactsResult,
  ] = await Promise.all([
    supabase
      .from("audience_contacts")
      .select("*")
      .or(
        "books_opt_in.eq.true,general_updates_opt_in.eq.true,lessons_opt_in.eq.true",
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("audience_contact_sync_state")
      .select("*")
      .not("last_error", "is", null),
    supabase
      .from("audience_contacts")
      .select("*")
      .eq("books_opt_in", false)
      .eq("general_updates_opt_in", false)
      .eq("lessons_opt_in", false)
      .order("updated_at", { ascending: false })
      .limit(limit),
  ]);

  if (
    subscribedContactsResult.error ||
    !subscribedContactsResult.data ||
    erroredSyncStatesResult.error ||
    !erroredSyncStatesResult.data ||
    inactiveContactsResult.error ||
    !inactiveContactsResult.data
  ) {
    let error = { message: "Could not load audience contacts." };
    if (subscribedContactsResult.error) {
      error = { message: subscribedContactsResult.error.message };
    } else if (erroredSyncStatesResult.error) {
      error = { message: erroredSyncStatesResult.error.message };
    } else if (inactiveContactsResult.error) {
      error = { message: inactiveContactsResult.error.message };
    }

    return {
      data: null,
      error,
    };
  }

  const subscribedContacts = subscribedContactsResult.data;
  const erroredContactIds = Array.from(
    new Set(
      erroredSyncStatesResult.data.map(
        (syncState) => syncState.audience_contact_id,
      ),
    ),
  );
  const subscribedContactIds = new Set(
    subscribedContacts.map((contact) => contact.id),
  );
  const missingErroredContactIds = erroredContactIds.filter(
    (contactId) => !subscribedContactIds.has(contactId),
  );

  let erroredContacts: typeof subscribedContacts = [];
  if (missingErroredContactIds.length > 0) {
    const erroredContactsResult = await supabase
      .from("audience_contacts")
      .select("*")
      .in("id", missingErroredContactIds);

    if (erroredContactsResult.error || !erroredContactsResult.data) {
      return {
        data: null,
        error: erroredContactsResult.error
          ? { message: erroredContactsResult.error.message }
          : { message: "Could not load audience contacts." },
      };
    }

    erroredContacts = erroredContactsResult.data;
  }

  const actionableContactIds = new Set([
    ...subscribedContacts.map((contact) => contact.id),
    ...erroredContacts.map((contact) => contact.id),
  ]);
  const inactiveContacts = inactiveContactsResult.data.filter(
    (contact) => !actionableContactIds.has(contact.id),
  );
  const audienceContacts = [
    ...subscribedContacts,
    ...erroredContacts,
    ...inactiveContacts,
  ];

  if (audienceContacts.length === 0) {
    return {
      data: [],
      error: null,
    };
  }

  const audienceContactIds = audienceContacts.map((contact) => contact.id);
  const syncStatesResult = await supabase
    .from("audience_contact_sync_state")
    .select("*")
    .in("audience_contact_id", audienceContactIds);

  if (syncStatesResult.error) {
    return {
      data: null,
      error: { message: syncStatesResult.error.message },
    };
  }

  const syncStateByContactId = new Map(
    (syncStatesResult.data ?? []).map((syncState) => [
      syncState.audience_contact_id,
      syncState,
    ]),
  );

  return {
    data: audienceContacts
      .map((contact) => ({
        ...contact,
        syncState: syncStateByContactId.get(contact.id) ?? null,
      }))
      .sort(compareAdminAudienceContactPriority),
    error: null,
  };
}

/**
 * Loads all active release drafts/deliveries plus a capped recent finished
 * history window, then attaches their snapshotted items for the admin UI.
 */
export async function getAdminContentReleases(
  supabase: AppSupabaseClient,
  limit = ADMIN_CONTENT_RELEASE_HISTORY_LIMIT,
): Promise<QueryResult<AdminContentRelease[]>> {
  const [activeReleasesResult, historyReleasesResult] = await Promise.all([
    supabase
      .from("content_releases")
      .select("*")
      .in("status", ["draft", "approved", "queued", "sending"])
      .order("updated_at", { ascending: false }),
    supabase
      .from("content_releases")
      .select("*")
      .in("status", ["sent", "cancelled"])
      .order("updated_at", { ascending: false })
      .limit(limit),
  ]);

  if (
    activeReleasesResult.error ||
    !activeReleasesResult.data ||
    historyReleasesResult.error ||
    !historyReleasesResult.data
  ) {
    let error = { message: "Could not load content releases." };
    if (activeReleasesResult.error) {
      error = { message: activeReleasesResult.error.message };
    } else if (historyReleasesResult.error) {
      error = { message: historyReleasesResult.error.message };
    }

    return {
      data: null,
      error,
    };
  }

  const contentReleases = [
    ...activeReleasesResult.data,
    ...historyReleasesResult.data,
  ];

  if (contentReleases.length === 0) {
    return {
      data: [],
      error: null,
    };
  }

  const releaseIds = contentReleases.map((release) => release.id);
  const [releaseItemsResult, releaseTargetsResult] = await Promise.all([
    supabase
      .from("content_release_items")
      .select("*")
      .in("release_id", releaseIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("content_release_targets")
      .select("*")
      .in("release_id", releaseIds)
      .order("created_at", { ascending: true }),
  ]);

  if (releaseItemsResult.error || releaseTargetsResult.error) {
    return {
      data: null,
      error: {
        message:
          releaseItemsResult.error?.message ??
          releaseTargetsResult.error?.message ??
          "Could not load content release details.",
      },
    };
  }

  const itemsByReleaseId = new Map<string, ContentReleaseItemRow[]>();
  const targetsByReleaseId = new Map<string, ContentReleaseTargetRow[]>();

  for (const item of releaseItemsResult.data ?? []) {
    const items = itemsByReleaseId.get(item.release_id) ?? [];
    items.push(item);
    itemsByReleaseId.set(item.release_id, items);
  }

  for (const target of releaseTargetsResult.data ?? []) {
    const targets = targetsByReleaseId.get(target.release_id) ?? [];
    targets.push(target);
    targetsByReleaseId.set(target.release_id, targets);
  }

  return {
    data: contentReleases
      .map((release) => ({
        ...release,
        items: itemsByReleaseId.get(release.id) ?? [],
        targets: targetsByReleaseId.get(release.id) ?? [],
      }))
      .sort(compareContentReleasePriority),
    error: null,
  };
}
