"use server";

import {
  hasResendAudienceEnv,
  syncStoredAudienceContactToResend,
} from "@/features/communications/lib/server/resend";
import { redactEmailAddress } from "@/lib/privacy";
import { revalidateAdminPaths } from "@/lib/server/revalidation";

import { getValidatedAdminContext } from "./shared";

import type { SyncAudienceContactsState } from "./states";

/**
 * Loads every stored audience contact and synchronizes it to Resend so the
 * provider-side audience state can be reconciled in one admin-triggered pass.
 */
export async function syncAudienceContactsWithResend(
  _prevState: SyncAudienceContactsState | null,
  _formData: FormData,
): Promise<SyncAudienceContactsState> {
  void _prevState;
  void _formData;

  const adminContext = await getValidatedAdminContext();
  if (!adminContext) {
    return {
      success: false,
      message: "Audience sync is unavailable right now.",
    };
  }

  if (!hasResendAudienceEnv()) {
    return {
      success: false,
      message: "Resend audience sync is not configured yet.",
    };
  }

  const { supabase } = adminContext;
  const { data: audienceContacts, error } = await supabase
    .from("audience_contacts")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error loading audience contacts for Resend sync:", error);
    return {
      success: false,
      message: "Could not load audience contacts for sync.",
    };
  }

  if (!audienceContacts || audienceContacts.length === 0) {
    return {
      success: true,
      message: "There are no audience contacts to sync yet.",
    };
  }

  const summary = await syncAudienceContacts(audienceContacts);

  revalidateAdminPaths();

  if (summary.failedCount > 0) {
    return {
      success: false,
      message: `Synced ${summary.syncedCount}, skipped ${summary.skippedCount}, failed ${summary.failedCount}.`,
    };
  }

  return {
    success: true,
    message: buildSyncAudienceSuccessMessage(summary),
  };
}

type AudienceSyncSummary = {
  failedCount: number;
  skippedCount: number;
  syncedCount: number;
};

/**
 * Processes audience contacts sequentially so the sync summary can capture
 * skipped, successful, and failed contacts in a deterministic order.
 */
async function syncAudienceContacts(
  audienceContacts: Array<
    Parameters<typeof syncStoredAudienceContactToResend>[0]
  >,
): Promise<AudienceSyncSummary> {
  const summary: AudienceSyncSummary = {
    failedCount: 0,
    skippedCount: 0,
    syncedCount: 0,
  };

  for (const contact of audienceContacts) {
    const syncResult = await syncStoredAudienceContactToResend(contact);
    if (!syncResult.success) {
      summary.failedCount += 1;
      console.error("Failed to sync audience contact with Resend", {
        audienceContactId: contact.id,
        email: redactEmailAddress(contact.email),
        error: syncResult.error,
      });
      continue;
    }

    if ("skipped" in syncResult && syncResult.skipped) {
      summary.skippedCount += 1;
      continue;
    }

    summary.syncedCount += 1;
  }

  return summary;
}

/**
 * Formats the success state for an audience sync run, including skipped counts
 * only when they are relevant to the final admin message.
 */
function buildSyncAudienceSuccessMessage(summary: AudienceSyncSummary) {
  const contactLabel = summary.syncedCount === 1 ? "" : "s";
  const skippedLabel =
    summary.skippedCount > 0 ? `, skipped ${summary.skippedCount}` : "";

  return `Synced ${summary.syncedCount} audience contact${contactLabel}${skippedLabel}.`;
}
