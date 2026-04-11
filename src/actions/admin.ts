"use server";

import { syncAudienceContactsWithResend as syncAudienceContactsWithResendAction } from "./admin/audience";
import {
  updateContactMessageStatus as updateContactMessageStatusAction,
  updateEntryReportStatus as updateEntryReportStatusAction,
} from "./admin/moderation";
import {
  createContentReleaseDraft as createContentReleaseDraftAction,
  deleteContentReleaseDraft as deleteContentReleaseDraftAction,
  sendContentRelease as sendContentReleaseAction,
  sendContentReleasePreview as sendContentReleasePreviewAction,
  updateContentReleaseStatus as updateContentReleaseStatusAction,
} from "./admin/releases";
import {
  deleteSubmission as deleteSubmissionSubmissionAction,
  submitFeedback as submitFeedbackAction,
} from "./admin/submissions";

import type {
  ContentReleaseDraftState,
  DeleteContentReleaseState,
  SendContentReleaseState,
  SyncAudienceContactsState,
} from "./admin/states";

/**
 * Re-exports the stable admin server-action entry points consumed by forms and
 * client components so the feature modules can stay internally organized.
 */
export async function submitFeedback(
  formData: FormData,
): ReturnType<typeof submitFeedbackAction> {
  return submitFeedbackAction(formData);
}

export async function deleteSubmission(
  formData: FormData,
): ReturnType<typeof deleteSubmissionSubmissionAction> {
  return deleteSubmissionSubmissionAction(formData);
}

export async function updateEntryReportStatus(
  formData: FormData,
): ReturnType<typeof updateEntryReportStatusAction> {
  return updateEntryReportStatusAction(formData);
}

export async function createContentReleaseDraft(
  prevState: ContentReleaseDraftState | null,
  formData: FormData,
): Promise<ContentReleaseDraftState> {
  return createContentReleaseDraftAction(prevState, formData);
}

export async function deleteContentReleaseDraft(
  prevState: DeleteContentReleaseState | null,
  formData: FormData,
): Promise<DeleteContentReleaseState> {
  return deleteContentReleaseDraftAction(prevState, formData);
}

export async function updateContentReleaseStatus(
  formData: FormData,
): ReturnType<typeof updateContentReleaseStatusAction> {
  return updateContentReleaseStatusAction(formData);
}

export async function sendContentRelease(
  prevState: SendContentReleaseState | null,
  formData: FormData,
): Promise<SendContentReleaseState> {
  return sendContentReleaseAction(prevState, formData);
}

export async function sendContentReleasePreview(
  prevState: SendContentReleaseState | null,
  formData: FormData,
): Promise<SendContentReleaseState> {
  return sendContentReleasePreviewAction(prevState, formData);
}

export async function syncAudienceContactsWithResend(
  prevState: SyncAudienceContactsState | null,
  formData: FormData,
): Promise<SyncAudienceContactsState> {
  return syncAudienceContactsWithResendAction(prevState, formData);
}

export async function updateContactMessageStatus(
  formData: FormData,
): ReturnType<typeof updateContactMessageStatusAction> {
  return updateContactMessageStatusAction(formData);
}
