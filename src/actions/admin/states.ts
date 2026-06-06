/**
 * Shared server-action result shapes used by the admin workspace forms.
 */
export type ContentReleaseDraftState = {
  error?: string;
  success: boolean;
};

export type DeleteContentReleaseState = {
  message?: string;
  success: boolean;
};

export type SendContentReleaseState = {
  message?: string;
  success: boolean;
};

export type SyncAudienceContactsState = {
  message?: string;
  success: boolean;
};
